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

export type ArticleTicker = {
  symbol: string;
  name: string;
};

export type NewsSource = {
  id: string;
  source: string;
  sourceName: string;
  title: string;
  url: string;
  publishedAt: string;
};

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  importance: number | null;
  confidence: number;
  sourceCount: number;
  sourceNames: string[];
  tickers: ArticleTicker[];
  firstSeenAt: string;
  lastSeenAt: string;
};

export type NewsPage = {
  items: NewsItem[];
  nextCursor: string | null;
};

export type NewsDetail = NewsItem & {
  sources: NewsSource[];
};

export type MarketBannerItem = {
  id: string;
  label: string;
  changePercent: number | null;
};

export type MarketBanner = {
  items: MarketBannerItem[];
  asOf: string;
};

export type MarketQuote = {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  points: number[];
  asOf: string;
};
