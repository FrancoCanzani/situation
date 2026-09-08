import { inArray } from "drizzle-orm";

import type { Db } from "../db";
import { articles } from "../db/schema";
import { FEEDS } from "./feeds";
import { hashUrl, parseFeedXml, type ParsedItem } from "./parse";
import { formatAiError, polishArticle, type PolishResult } from "./polish";

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
  errors: string[];
};

export async function runIngest(env: CloudflareBindings, db: Db): Promise<IngestResult> {
  const ingestStarted = performance.now();
  const result: IngestResult = {
    fetched: 0,
    inserted: 0,
    skipped: 0,
    hidden: 0,
    polished: 0,
    unpolished: 0,
    errors: [],
  };

  const candidates: Array<{
    source: string;
    title: string;
    url: string;
    urlHash: string;
    rawSummary: string;
    publishedAt: Date;
  }> = [];

  const feeds = await Promise.all(
    FEEDS.map(async (feed) => {
      const started = performance.now();
      try {
        const response = await fetch(feed.url, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(12_000),
        });
        if (!response.ok) {
          const message = `HTTP ${response.status}`;
          console.error("[ingest] feed", feed.id, elapsed(started), message);
          return { feed, error: message, items: [] as ParsedItem[] };
        }
        const xml = await response.text();
        return { feed, error: null, items: parseFeedXml(xml) };
      } catch (error) {
        const message = error instanceof Error ? error.message : "fetch failed";
        console.error("[ingest] feed", feed.id, elapsed(started), message);
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
        urlHash: await hashUrl(item.url),
        rawSummary: item.rawSummary,
        publishedAt: item.publishedAt,
      });
    }
  }

  if (candidates.length === 0) {
    console.log("[ingest] done", elapsed(ingestStarted), result);
    return result;
  }

  const hashes = [...new Set(candidates.map((c) => c.urlHash))];
  const existing = new Set<string>();
  for (let i = 0; i < hashes.length; i += 80) {
    const chunk = hashes.slice(i, i + 80);
    const rows = await db
      .select({ urlHash: articles.urlHash })
      .from(articles)
      .where(inArray(articles.urlHash, chunk));
    for (const row of rows) existing.add(row.urlHash);
  }

  const fresh = candidates.filter((c) => !existing.has(c.urlHash));
  result.skipped = candidates.length - fresh.length;

  const toProcess = fresh
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, MAX_NEW_PER_RUN);

  const now = new Date();

  for (const item of toProcess) {
    let polished: PolishResult | null = null;
    try {
      polished = await polishArticle(env.AI, {
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

    const keep = polished?.keep ?? true;
    const summary =
      polished?.summary ??
      item.rawSummary.slice(0, 400) ??
      item.title;
    const category = polished?.category ?? "other";
    const sentiment = polished?.sentiment ?? "neutral";

    if (!keep) result.hidden += 1;

    await db
      .insert(articles)
      .values({
        id: crypto.randomUUID(),
        url: item.url,
        urlHash: item.urlHash,
        source: item.source,
        title: item.title,
        rawSummary: item.rawSummary,
        summary,
        category,
        sentiment,
        keep,
        publishedAt: item.publishedAt,
        ingestedAt: now,
      })
      .onConflictDoNothing();

    result.inserted += 1;
  }

  console.log("[ingest] done", elapsed(ingestStarted), result);
  return result;
}

function elapsed(start: number): string {
  return `${Math.round(performance.now() - start)}ms`;
}
