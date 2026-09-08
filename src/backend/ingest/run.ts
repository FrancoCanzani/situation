import { inArray } from "drizzle-orm";

import type { Db } from "../db";
import { articles } from "../db/schema";
import { FEEDS } from "./feeds";
import { hashUrl, parseFeedXml, type ParsedItem } from "./parse";
import { polishArticle } from "./polish";

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

  const feedsStarted = performance.now();
  const feeds = await Promise.all(
    FEEDS.map(async (feed) => {
      const started = performance.now();
      try {
        const response = await fetch(feed.url, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(12_000),
        });
        if (!response.ok) {
          console.error("[ingest] feed", feed.id, elapsed(started), `HTTP ${response.status}`);
          return { feed, error: `HTTP ${response.status}`, items: [] as ParsedItem[] };
        }
        const xml = await response.text();
        const items = parseFeedXml(xml);
        console.log("[ingest] feed", feed.id, elapsed(started), `${items.length} items`);
        return { feed, error: null, items };
      } catch (error) {
        const message = error instanceof Error ? error.message : "fetch failed";
        console.error("[ingest] feed", feed.id, elapsed(started), message);
        return { feed, error: message, items: [] as ParsedItem[] };
      }
    }),
  );
  console.log("[ingest] feeds wall", elapsed(feedsStarted), `${FEEDS.length} feeds`);

  const hashStarted = performance.now();
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
  console.log("[ingest] candidates", candidates.length, elapsed(hashStarted));

  if (candidates.length === 0) {
    console.log("[ingest] done", elapsed(ingestStarted), result);
    return result;
  }

  const dedupeStarted = performance.now();
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

  console.log("[ingest] dedupe", elapsed(dedupeStarted), {
    unique: hashes.length,
    existing: existing.size,
    fresh: fresh.length,
    process: toProcess.length,
    skipped: result.skipped,
  });

  const now = new Date();
  const polishLoopStarted = performance.now();

  for (const [index, item] of toProcess.entries()) {
    console.log("[ingest] item", `${index + 1}/${toProcess.length}`, item.source, item.title);
    const itemStarted = performance.now();
    const polished = await polishArticle(env.AI, {
      title: item.title,
      rawSummary: item.rawSummary,
      source: item.source,
    });

    if (!polished) {
      result.unpolished += 1;
      result.errors.push(`polish: ${item.source} ${item.title}`);
    } else {
      result.polished += 1;
    }

    const keep = polished?.keep ?? true;
    const summary =
      polished?.summary ??
      item.rawSummary.slice(0, 400) ??
      item.title;
    const category = polished?.category ?? "other";
    const sentiment = polished?.sentiment ?? "neutral";

    if (!keep) result.hidden += 1;

    const insertStarted = performance.now();
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
    const insertMs = Math.round(performance.now() - insertStarted);

    result.inserted += 1;
    console.log("[ingest] item done", `${index + 1}/${toProcess.length}`, elapsed(itemStarted), {
      insertMs,
      category,
      sentiment,
      keep,
      polished: Boolean(polished),
    });
  }

  console.log("[ingest] polish loop", elapsed(polishLoopStarted), {
    polished: result.polished,
    unpolished: result.unpolished,
  });
  console.log("[ingest] done", elapsed(ingestStarted), result);
  return result;
}

function elapsed(start: number): string {
  return `${Math.round(performance.now() - start)}ms`;
}
