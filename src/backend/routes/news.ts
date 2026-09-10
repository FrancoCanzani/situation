import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { Hono } from "hono";

import type {
  ArticleTicker,
  NewsDetail,
  NewsItem,
  NewsPage,
} from "../../shared/types";
import { createDb } from "../db";
import { articles, events } from "../db/schema";
import { sourceName } from "../ingest/feeds";
import { decodeCursor, encodeCursor } from "../utils/cursor";

type SourceMeta = {
  tickers: ArticleTicker[] | null;
  source: string;
  publishedAt: Date;
};

function mergeTickers(rows: Array<{ tickers: ArticleTicker[] | null }>): ArticleTicker[] {
  const seen = new Set<string>();
  const out: ArticleTicker[] = [];
  for (const row of rows) {
    for (const ticker of row.tickers ?? []) {
      const symbol = ticker.symbol.trim().toUpperCase();
      if (!symbol || seen.has(symbol)) continue;
      seen.add(symbol);
      out.push({ symbol, name: ticker.name });
    }
  }
  return out;
}

function sourceNamesFrom(rows: SourceMeta[]): string[] {
  const ordered = [...rows].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of ordered) {
    const name = sourceName(row.source);
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

function toDto(
  row: typeof events.$inferSelect,
  tickers: ArticleTicker[],
  sourceNames: string[],
): NewsItem {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    importance: row.importance,
    confidence: row.confidence,
    sourceCount: row.sourceCount,
    sourceNames,
    tickers,
    firstSeenAt: row.firstSeenAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
  };
}

export const newsRoutes = new Hono<{ Bindings: CloudflareBindings }>();

newsRoutes.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const limitRaw = Number(c.req.query("limit") ?? "30");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 30;
  const cursor = decodeCursor(c.req.query("cursor") ?? undefined);

  const filters = [];
  if (cursor) {
    filters.push(
      or(
        lt(events.lastSeenAt, cursor.at),
        and(eq(events.lastSeenAt, cursor.at), lt(events.id, cursor.id)),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(events)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(events.lastSeenAt), desc(events.id))
    .limit(limit + 1);

  const pageRows = rows.slice(0, limit);
  const metaByEvent = new Map<string, SourceMeta[]>();
  const ids = pageRows.map((row) => row.id);

  if (ids.length > 0) {
    const sourceRows = await db
      .select({
        eventId: articles.eventId,
        tickers: articles.tickers,
        source: articles.source,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .where(and(eq(articles.keep, true), inArray(articles.eventId, ids)));

    for (const row of sourceRows) {
      if (!row.eventId) continue;
      const list = metaByEvent.get(row.eventId) ?? [];
      list.push(row);
      metaByEvent.set(row.eventId, list);
    }
  }

  const last = pageRows[pageRows.length - 1];
  const payload: NewsPage = {
    items: pageRows.map((row) => {
      const meta = metaByEvent.get(row.id) ?? [];
      return toDto(row, mergeTickers(meta), sourceNamesFrom(meta));
    }),
    nextCursor:
      rows.length > limit && last ? encodeCursor(last.lastSeenAt, last.id) : null,
  };

  return c.json(payload);
});

newsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  const [row] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (!row) return c.json({ error: "not_found" }, 404);

  const sourceRows = await db
    .select()
    .from(articles)
    .where(and(eq(articles.eventId, id), eq(articles.keep, true)))
    .orderBy(desc(articles.publishedAt), desc(articles.id));

  const payload: NewsDetail = {
    ...toDto(row, mergeTickers(sourceRows), sourceNamesFrom(sourceRows)),
    sources: sourceRows.map((article) => ({
      id: article.id,
      source: article.source,
      sourceName: sourceName(article.source),
      title: article.title,
      url: article.url,
      publishedAt: article.publishedAt.toISOString(),
    })),
  };

  return c.json(payload);
});
