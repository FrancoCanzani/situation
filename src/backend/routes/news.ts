import { and, desc, eq, exists, inArray, lt, or, sql } from "drizzle-orm";
import { Hono } from "hono";

import {
  CATEGORIES,
  type Category,
  type FeedSort,
  type NewsDetail,
  type NewsItem,
  type NewsPage,
  type Sentiment,
} from "../../shared/types";
import { createDb } from "../db";
import { articles, events } from "../db/schema";
import { sourceName } from "../ingest/sources";
import {
  decodeCursor,
  encodeDateCursor,
  encodeRelevanceCursor,
} from "../utils/cursor";

type SourceMeta = {
  source: string;
  publishedAt: Date;
  category: Category;
  sentiment: Sentiment;
};

const importanceScore = sql<number>`coalesce(${events.importance}, 0)`;

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

function primaryMeta(rows: SourceMeta[]): {
  category: Category | null;
  sentiment: Sentiment | null;
} {
  if (rows.length === 0) return { category: null, sentiment: null };
  const newest = [...rows].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  )[0];
  return {
    category: newest?.category ?? null,
    sentiment: newest?.sentiment ?? null,
  };
}

function isCategory(value: string): value is Category {
  for (const category of CATEGORIES) {
    if (category === value) return true;
  }
  return false;
}

function parseCategories(value: string | undefined): Category[] | undefined {
  if (!value?.trim()) return undefined;
  const selected: Category[] = [];
  const seen = new Set<Category>();
  for (const part of value.split(",")) {
    const category = part.trim().toLowerCase();
    if (!isCategory(category) || seen.has(category)) continue;
    seen.add(category);
    selected.push(category);
  }
  if (selected.length === 0 || selected.length === CATEGORIES.length) {
    return undefined;
  }
  return selected;
}

function parseSort(value: string | undefined): FeedSort {
  return value === "relevance" ? "relevance" : "date";
}

function toDto(
  row: typeof events.$inferSelect,
  sources: SourceMeta[],
): NewsItem {
  const primary = primaryMeta(sources);
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    importance: row.importance,
    confidence: row.confidence,
    sourceCount: row.sourceCount,
    sourceNames: sourceNamesFrom(sources),
    category: primary.category,
    sentiment: primary.sentiment,
    countryCode: row.countryCode,
    imageUrl: row.imageUrl,
    firstSeenAt: row.firstSeenAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    bumpedAt: row.bumpedAt.toISOString(),
    updated: row.bumpedAt.getTime() > row.firstSeenAt.getTime(),
  };
}

export const newsRoutes = new Hono<{ Bindings: CloudflareBindings }>();

newsRoutes.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const limitRaw = Number(c.req.query("limit") ?? "30");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 30;
  const sort = parseSort(c.req.query("sort"));
  const cursor = decodeCursor(c.req.query("cursor") ?? undefined, sort);
  const categoryRaw = c.req.query("category");
  const category =
    categoryRaw && isCategory(categoryRaw) ? categoryRaw : undefined;
  const categories = parseCategories(c.req.query("categories"));

  const filters = [];
  if (category) {
    filters.push(
      exists(
        db
          .select({ id: articles.id })
          .from(articles)
          .where(
            and(
              eq(articles.eventId, events.id),
              eq(articles.keep, true),
              eq(articles.category, category),
            ),
          ),
      ),
    );
  } else if (categories) {
    filters.push(
      exists(
        db
          .select({ id: articles.id })
          .from(articles)
          .where(
            and(
              eq(articles.eventId, events.id),
              eq(articles.keep, true),
              inArray(articles.category, categories),
            ),
          ),
      ),
    );
  }
  if (cursor) {
    switch (cursor.sort) {
      case "date":
        filters.push(
          or(
            lt(events.bumpedAt, cursor.at),
            and(eq(events.bumpedAt, cursor.at), lt(events.id, cursor.id)),
          )!,
        );
        break;
      case "relevance":
        filters.push(
          or(
            lt(importanceScore, cursor.importance),
            and(
              eq(importanceScore, cursor.importance),
              lt(events.bumpedAt, cursor.at),
            ),
            and(
              eq(importanceScore, cursor.importance),
              eq(events.bumpedAt, cursor.at),
              lt(events.id, cursor.id),
            ),
          )!,
        );
        break;
      default: {
        const _exhaustive: never = cursor;
        void _exhaustive;
      }
    }
  }

  const orderBy =
    sort === "relevance"
      ? [desc(importanceScore), desc(events.bumpedAt), desc(events.id)]
      : [desc(events.bumpedAt), desc(events.id)];

  const rows = await db
    .select()
    .from(events)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(...orderBy)
    .limit(limit + 1);

  const pageRows = rows.slice(0, limit);
  const metaByEvent = new Map<string, SourceMeta[]>();
  const ids = pageRows.map((row) => row.id);

  if (ids.length > 0) {
    const sourceRows = await db
      .select({
        eventId: articles.eventId,
        source: articles.source,
        publishedAt: articles.publishedAt,
        category: articles.category,
        sentiment: articles.sentiment,
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
  let nextCursor: string | null = null;
  if (rows.length > limit && last) {
    switch (sort) {
      case "relevance":
        nextCursor = encodeRelevanceCursor(
          last.importance ?? 0,
          last.bumpedAt,
          last.id,
        );
        break;
      case "date":
        nextCursor = encodeDateCursor(last.bumpedAt, last.id);
        break;
      default: {
        const _exhaustive: never = sort;
        void _exhaustive;
      }
    }
  }

  const payload: NewsPage = {
    items: pageRows.map((row) => {
      const meta = metaByEvent.get(row.id) ?? [];
      return toDto(row, meta);
    }),
    nextCursor,
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
    ...toDto(row, sourceRows),
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
