import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { ArticleTicker, Category, Sentiment } from "../../shared/types";

export const articles = sqliteTable("articles", {
  id: text("id").primaryKey(),
  url: text("url").notNull().unique(),
  source: text("source").notNull(),
  title: text("title").notNull(),
  rawSummary: text("raw_summary").notNull().default(""),
  summary: text("summary").notNull().default(""),
  category: text("category").$type<Category>().notNull().default("other"),
  sentiment: text("sentiment").$type<Sentiment>().notNull().default("neutral"),
  importance: integer("importance"),
  tickers: text("tickers", { mode: "json" })
    .$type<ArticleTicker[]>()
    .notNull()
    .default([]),
  keep: integer("keep", { mode: "boolean" }).notNull().default(true),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }).notNull(),
  ingestedAt: integer("ingested_at", { mode: "timestamp_ms" }).notNull(),
});

export type ArticleRow = typeof articles.$inferSelect;
export type NewArticleRow = typeof articles.$inferInsert;
