import { and, desc, eq, lt, or } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";
import { articles } from "../db/schema";
import { sourceName } from "../ingest/feeds";
import type { NewsPage } from "../../shared/types";
import { CATEGORIES } from "../../shared/types";

function encodeCursor(publishedAt: Date, id: string) {
  return `${publishedAt.getTime()}_${id}`;
}

function decodeCursor(cursor: string | undefined) {
  const [ms, id] = cursor?.split("_", 2) ?? [];
  const time = Number(ms);
  if (!id || !Number.isFinite(time)) return null;
  return { publishedAt: new Date(time), id };
}

export const newsRoutes = new Hono<{ Bindings: CloudflareBindings }>();

newsRoutes.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const limitRaw = Number(c.req.query("limit") ?? "30");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 30;
  const cursor = decodeCursor(c.req.query("cursor") ?? undefined);

  const filters = [eq(articles.keep, true)];
  const matchedCategory = CATEGORIES.find((entry) => entry === c.req.query("category"));
  if (matchedCategory) {
    filters.push(eq(articles.category, matchedCategory));
  }
  if (cursor) {
    filters.push(
      or(
        lt(articles.publishedAt, cursor.publishedAt),
        and(eq(articles.publishedAt, cursor.publishedAt), lt(articles.id, cursor.id)),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(articles)
    .where(and(...filters))
    .orderBy(desc(articles.publishedAt), desc(articles.id))
    .limit(limit + 1);

  const pageRows = rows.slice(0, limit);
  const last = pageRows[pageRows.length - 1];
  const payload: NewsPage = {
    items: pageRows.map((row) => ({
      id: row.id,
      source: row.source,
      sourceName: sourceName(row.source),
      title: row.title,
      url: row.url,
      summary: row.summary || row.rawSummary || row.title,
      category: row.category,
      sentiment: row.sentiment,
      tickers: row.tickers ?? [],
      publishedAt: row.publishedAt.toISOString(),
    })),
    nextCursor:
      rows.length > limit && last ? encodeCursor(last.publishedAt, last.id) : null,
  };

  return c.json(payload);
});

newsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  const [row] = await db
    .select()
    .from(articles)
    .where(and(eq(articles.id, id), eq(articles.keep, true)))
    .limit(1);

  if (!row) return c.json({ error: "not_found" }, 404);
  return c.json({
    id: row.id,
    source: row.source,
    sourceName: sourceName(row.source),
    title: row.title,
    url: row.url,
    summary: row.summary || row.rawSummary || row.title,
    category: row.category,
    sentiment: row.sentiment,
    tickers: row.tickers ?? [],
    publishedAt: row.publishedAt.toISOString(),
  });
});
