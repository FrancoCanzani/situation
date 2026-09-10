import { inArray } from "drizzle-orm";

import type { ArticleTicker } from "../../shared/types";
import type { Db } from "../db";
import { articles } from "../db/schema";
import { resolveMentions } from "../market/resolve";
import { assignArticleEvent } from "./events";
import { FEEDS } from "./feeds";
import { parseFeedXml, type ParsedItem } from "./parse";
import {
  formatAiError,
  keepFromPolish,
  polishArticle,
  type PolishResult,
} from "./polish";

const MAX_NEW_PER_RUN = 20;
const FETCH_HEADERS = {
  "User-Agent": "SituationBot/0.1 (+https://situation.local)",
  Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
};

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
  }> = [];

  const feeds = await Promise.all(
    FEEDS.map(async (feed) => {
      try {
        const response = await fetch(feed.url, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) {
          const message = `HTTP ${response.status}`;
          console.error("[ingest] feed", feed.id, message);
          return { feed, error: message, items: [] as ParsedItem[] };
        }
        const xml = await response.text();
        return { feed, error: null, items: parseFeedXml(xml) };
      } catch (error) {
        const message = error instanceof Error ? error.message : "fetch failed";
        console.error("[ingest] feed", feed.id, message);
        return { feed, error: message, items: [] as ParsedItem[] };
      }
    }),
  );

  for (const entry of feeds) {
    if (entry.error) {
      result.errors.push(`${entry.feed.id}: ${entry.error}`);
      continue;
    }
    result.fetched += entry.items.length;
    for (const item of entry.items) {
      candidates.push({
        source: entry.feed.id,
        title: item.title,
        url: item.url,
        rawSummary: item.rawSummary,
        publishedAt: item.publishedAt,
      });
    }
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
    const category = polished?.category ?? "other";
    const sentiment = polished?.sentiment ?? "neutral";
    const importance = polished?.importance ?? null;

    let tickers: ArticleTicker[] = [];
    if (keep && polished?.mentions?.length) {
      try {
        tickers = await resolveMentions(item.title, polished.mentions);
      } catch (error) {
        const message = error instanceof Error ? error.message : "resolve failed";
        result.errors.push(`${item.source} ${item.title}: tickers ${message}`);
      }
    }

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
        tickers,
        keep,
        publishedAt: item.publishedAt,
        ingestedAt: now,
      })
      .onConflictDoNothing();

    result.inserted += 1;

    if (keep && ai) {
      try {
        const clustered = await assignArticleEvent(env, db, {
          articleId,
          title: item.title,
          summary,
          importance,
          publishedAt: item.publishedAt,
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
