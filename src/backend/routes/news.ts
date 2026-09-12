import { and, desc, eq, exists, inArray, lt, or } from "drizzle-orm";
import { Hono } from "hono";

import {
  CATEGORIES,
  type Category,
  type NewsDetail,
  type NewsItem,
  type NewsPage,
} from "../../shared/types";
import { createDb } from "../db";
import { articles, events } from "../db/schema";
import { sourceName } from "../ingest/sources";
import { decodeCursor, encodeCursor } from "../utils/cursor";

type SourceMeta = {
  source: string;
  publishedAt: Date;
};

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

function isCategory(value: string): value is Category {
  for (const category of CATEGORIES) {
    if (category === value) return true;
  }
  return false;
}

function toDto(
  row: typeof events.$inferSelect,
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
  const cursor = decodeCursor(c.req.query("cursor") ?? undefined);
  const categoryRaw = c.req.query("category");
  const category =
    categoryRaw && isCategory(categoryRaw) ? categoryRaw : undefined;

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
  }
  if (cursor) {
    filters.push(
      or(
        lt(events.bumpedAt, cursor.at),
        and(eq(events.bumpedAt, cursor.at), lt(events.id, cursor.id)),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(events)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(events.bumpedAt), desc(events.id))
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
      return toDto(row, sourceNamesFrom(meta));
    }),
    nextCursor:
      rows.length > limit && last ? encodeCursor(last.bumpedAt, last.id) : null,
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
    ...toDto(row, sourceNamesFrom(sourceRows)),
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
