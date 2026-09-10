import { createFileRoute } from "@tanstack/react-router";

import { FeedPage } from "@/features/feed/components/feed-page";

export const Route = createFileRoute("/")({
  component: FeedPage,
});
