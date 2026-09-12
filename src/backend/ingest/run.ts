import { inArray } from "drizzle-orm";

import type { Db } from "../db";
import { articles } from "../db/schema";
import { assignArticleEvent } from "./events";
import { FetchError, articlesFor } from "./fetch";
import { resolveArticleImage } from "./image";
import {
  formatAiError,
  keepFromPolish,
  polishArticle,
  type PolishResult,
} from "./polish";
import { shouldSkipHeuristically } from "./skip";
import { SOURCES } from "./sources";

const MAX_NEW_PER_RUN = 20;

export type IngestResult = {
  fetched: number;
  inserted: number;
  skipped: number;
  hidden: number;
  polished: number;
  unpolished: number;
  clustered: number;
  eventsCreated: number;
  errors: string[];
};

export async function runIngest(env: CloudflareBindings, db: Db): Promise<IngestResult> {
  const result: IngestResult = {
    fetched: 0,
    inserted: 0,
    skipped: 0,
    hidden: 0,
    polished: 0,
    unpolished: 0,
    clustered: 0,
    eventsCreated: 0,
    errors: [],
  };

  const candidates: Array<{
    source: string;
    title: string;
    url: string;
    rawSummary: string;
    publishedAt: Date;
    imageUrl?: string;
  }> = [];

  const fetched = await Promise.all(
    SOURCES.map(async (source) => {
      try {
        const parsed = await articlesFor(source);
        const items = parsed.flatMap((article) => {
          if (shouldSkipHeuristically(article.title, article.url)) return [];
          return [
            {
              source: source.id,
              title: article.title,
              url: article.url,
              rawSummary: article.text.slice(0, 2000),
              publishedAt: article.publishedAt ?? new Date(),
              imageUrl: article.image,
            },
          ];
        });
        return { source, error: null, items };
      } catch (error) {
        const message =
          error instanceof FetchError
            ? error.message
            : error instanceof Error
              ? error.message
              : "fetch failed";
        console.error("[ingest] source", source.id, message);
        return { source, error: message, items: [] as typeof candidates };
      }
    }),
  );

  for (const entry of fetched) {
    if (entry.error) {
      result.errors.push(`${entry.source.id}: ${entry.error}`);
      continue;
    }
    result.fetched += entry.items.length;
    candidates.push(...entry.items);
  }

  if (candidates.length === 0) return result;

  const urls = [...new Set(candidates.map((c) => c.url))];
  const existing = new Set<string>();
  for (let i = 0; i < urls.length; i += 80) {
    const chunk = urls.slice(i, i + 80);
    const rows = await db
      .select({ url: articles.url })
      .from(articles)
      .where(inArray(articles.url, chunk));
    for (const row of rows) existing.add(row.url);
  }

  const fresh = candidates.filter((c) => !existing.has(c.url));
  result.skipped = candidates.length - fresh.length;

  const toProcess = fresh
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, MAX_NEW_PER_RUN);

  const now = new Date();
  const ai = env.AI;

  for (const item of toProcess) {
    let polished: PolishResult | null = null;

    if (!ai) {
      result.unpolished += 1;
    } else {
      try {
        polished = await polishArticle(ai, {
          title: item.title,
          rawSummary: item.rawSummary,
          source: item.source,
        });
        result.polished += 1;
      } catch (error) {
        const message = formatAiError(error);
        result.unpolished += 1;
        result.errors.push(`${item.source} ${item.title}: ${message}`);
        console.error("[ingest] polish", item.source, item.title, message);
      }
    }

    const keep = keepFromPolish(polished);
    const summary =
      polished?.summary ?? item.rawSummary.slice(0, 400) ?? item.title;
    const category = polished?.category ?? "politics";
    const sentiment = polished?.sentiment ?? "neutral";
    const importance = polished?.importance ?? null;

    if (!keep) result.hidden += 1;

    const articleId = crypto.randomUUID();

    await db
      .insert(articles)
      .values({
        id: articleId,
        url: item.url,
        source: item.source,
        title: item.title,
        rawSummary: item.rawSummary,
        summary,
        category,
        sentiment,
        importance,
        keep,
        publishedAt: item.publishedAt,
        ingestedAt: now,
      })
      .onConflictDoNothing();

    result.inserted += 1;

    if (keep && ai) {
      try {
        const imageUrl = await resolveArticleImage({
          feedImage: item.imageUrl,
          pageUrl: item.url,
          importance,
        });
        const clustered = await assignArticleEvent(env, db, {
          articleId,
          title: item.title,
          summary,
          importance,
          publishedAt: item.publishedAt,
          imageUrl,
        });
        result.clustered += 1;
        if (clustered.created) result.eventsCreated += 1;
      } catch (error) {
        const message = formatAiError(error);
        result.errors.push(`${item.source} ${item.title}: event ${message}`);
        console.error("[ingest] event", item.source, item.title, message);
      }
    }
  }

  return result;
}
