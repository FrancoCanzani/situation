import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const articles = sqliteTable("articles", {
  id: text("id").primaryKey(),
  url: text("url").notNull().unique(),
  urlHash: text("url_hash").notNull().unique(),
  source: text("source").notNull(),
  title: text("title").notNull(),
  rawSummary: text("raw_summary").notNull().default(""),
  summary: text("summary").notNull().default(""),
  category: text("category").notNull().default("other"),
  sentiment: text("sentiment").notNull().default("neutral"),
  keep: integer("keep", { mode: "boolean" }).notNull().default(true),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }).notNull(),
  ingestedAt: integer("ingested_at", { mode: "timestamp_ms" }).notNull(),
});

export type ArticleRow = typeof articles.$inferSelect;
export type NewArticleRow = typeof articles.$inferInsert;
