export const CATEGORIES = [
  "politics",
  "business",
  "tech",
  "sports",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const SENTIMENTS = ["positive", "negative", "neutral", "mixed"] as const;

export type Sentiment = (typeof SENTIMENTS)[number];

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
  countryCode: string | null;
  imageUrl: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  bumpedAt: string;
  updated: boolean;
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
