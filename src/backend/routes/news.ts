import { and, desc, eq, lt, or, SQL } from "drizzle-orm";
import { Hono } from "hono";

import type { Db } from "../db";
import { articles } from "../db/schema";
import { sourceName } from "../ingest/feeds";
import type { ArticleDto, Category, NewsPage, Sentiment } from "../../shared/types";
import { CATEGORIES } from "../../shared/types";

type Env = {
  Variables: {
    db: Db;
  };
};

function encodeCursor(publishedAt: Date, id: string): string {
  return `${publishedAt.getTime()}_${id}`;
}

function decodeCursor(cursor: string | undefined): { publishedAt: Date; id: string } | null {
  if (!cursor) return null;
  const [ms, ...rest] = cursor.split("_");
  const id = rest.join("_");
  const time = Number(ms);
  if (!id || !Number.isFinite(time)) return null;
  return { publishedAt: new Date(time), id };
}

function toDto(row: typeof articles.$inferSelect): ArticleDto {
  return {
    id: row.id,
    source: row.source,
    sourceName: sourceName(row.source),
    title: row.title,
    url: row.url,
    summary: row.summary || row.rawSummary || row.title,
    category: (CATEGORIES.includes(row.category as Category)
      ? row.category
      : "other") as Category,
    sentiment: row.sentiment as Sentiment,
    publishedAt: row.publishedAt.toISOString(),
  };
}

export const newsRoutes = new Hono<Env>();

newsRoutes.get("/", async (c) => {
  const limitRaw = Number(c.req.query("limit") ?? "30");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 30;
  const cursor = decodeCursor(c.req.query("cursor") ?? undefined);
  const category = c.req.query("category");

  const filters: SQL[] = [eq(articles.keep, true)];
  if (category && CATEGORIES.includes(category as Category)) {
    filters.push(eq(articles.category, category));
  }
  if (cursor) {
    filters.push(
      or(
        lt(articles.publishedAt, cursor.publishedAt),
        and(eq(articles.publishedAt, cursor.publishedAt), lt(articles.id, cursor.id)),
      )!,
    );
  }

  const rows = await c.var.db
    .select()
    .from(articles)
    .where(and(...filters))
    .orderBy(desc(articles.publishedAt), desc(articles.id))
    .limit(limit + 1);

  const pageRows = rows.slice(0, limit);
  const last = pageRows[pageRows.length - 1];
  const payload: NewsPage = {
    items: pageRows.map(toDto),
    nextCursor:
      rows.length > limit && last ? encodeCursor(last.publishedAt, last.id) : null,
  };

  return c.json(payload);
});

newsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [row] = await c.var.db
    .select()
    .from(articles)
    .where(and(eq(articles.id, id), eq(articles.keep, true)))
    .limit(1);

  if (!row) return c.json({ error: "not_found" }, 404);
  return c.json(toDto(row));
});
