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
