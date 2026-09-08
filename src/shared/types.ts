export const CATEGORIES = [
  "world",
  "politics",
  "business",
  "tech",
  "science",
  "health",
  "climate",
  "sports",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const SENTIMENTS = [
  "positive",
  "negative",
  "neutral",
  "mixed",
] as const;

export type Sentiment = (typeof SENTIMENTS)[number];

export type ArticleDto = {
  id: string;
  source: string;
  sourceName: string;
  title: string;
  url: string;
  summary: string;
  category: Category;
  sentiment: Sentiment;
  publishedAt: string;
};

export type NewsPage = {
  items: ArticleDto[];
  nextCursor: string | null;
};
