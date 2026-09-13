import { CATEGORIES, type Category } from "@shared/types";

export const FEED_TOPICS = ["all", ...CATEGORIES] as const;

export type FeedTopic = (typeof FEED_TOPICS)[number];

export function isCategoryTopic(topic: FeedTopic): topic is Category {
  return topic !== "all";
}

export function topicLabel(topic: FeedTopic): string {
  if (topic === "all") return "All";
  return topic.charAt(0).toUpperCase() + topic.slice(1);
}

export function parseCols(raw: unknown): FeedTopic[] {
  if (typeof raw !== "string" || !raw.trim()) return [...FEED_TOPICS];
  const selected = new Set<FeedTopic>();
  for (const part of raw.split(",")) {
    const topic = part.trim().toLowerCase();
    if ((FEED_TOPICS as readonly string[]).includes(topic)) {
      selected.add(topic as FeedTopic);
    }
  }
  const ordered = FEED_TOPICS.filter((topic) => selected.has(topic));
  return ordered.length > 0 ? ordered : [...FEED_TOPICS];
}

export function serializeCols(cols: FeedTopic[]): string | undefined {
  if (cols.length === FEED_TOPICS.length) return undefined;
  return cols.join(",");
}

export function toggleCol(cols: FeedTopic[], topic: FeedTopic): FeedTopic[] {
  if (cols.includes(topic)) {
    if (cols.length <= 1) return cols;
    return cols.filter((entry) => entry !== topic);
  }
  return FEED_TOPICS.filter((entry) => entry === topic || cols.includes(entry));
}

export function mobileTopic(cols: FeedTopic[]): FeedTopic {
  return cols.includes("all") ? "all" : (cols[0] ?? "all");
}

export function parseCats(raw: unknown): Category[] {
  if (typeof raw !== "string" || !raw.trim()) return [...CATEGORIES];
  const selected = new Set<Category>();
  for (const part of raw.split(",")) {
    const category = part.trim().toLowerCase();
    if ((CATEGORIES as readonly string[]).includes(category)) {
      selected.add(category as Category);
    }
  }
  const ordered = CATEGORIES.filter((category) => selected.has(category));
  return ordered.length > 0 ? ordered : [...CATEGORIES];
}

export function serializeCats(cats: Category[]): string | undefined {
  if (cats.length === CATEGORIES.length) return undefined;
  return cats.join(",");
}

export function toggleCat(cats: Category[], category: Category): Category[] {
  if (cats.includes(category)) {
    if (cats.length <= 1) return cats;
    return cats.filter((entry) => entry !== category);
  }
  return CATEGORIES.filter(
    (entry) => entry === category || cats.includes(entry),
  );
}
