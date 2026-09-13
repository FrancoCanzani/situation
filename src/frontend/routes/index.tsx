import { createFileRoute } from "@tanstack/react-router";

import { FeedPage } from "@/features/feed/components/feed-page";
import type { FeedSort } from "@shared/types";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    sort: (search.sort === "relevance" ? "relevance" : "date") as FeedSort,
    cols: typeof search.cols === "string" ? search.cols : undefined,
    cats: typeof search.cats === "string" ? search.cats : undefined,
  }),
  component: FeedPage,
});
