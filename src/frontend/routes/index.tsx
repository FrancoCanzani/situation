import { createFileRoute } from "@tanstack/react-router";

import { Feed } from "@/features/feed/components/Feed";

export const Route = createFileRoute("/")({
  component: Feed,
});
