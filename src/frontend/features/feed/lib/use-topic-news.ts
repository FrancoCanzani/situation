import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState, type RefObject } from "react";

import type { NewsPage } from "@shared/types";

import { isCategoryTopic, type FeedTopic } from "./topics";

async function fetchNewsPage({
  pageParam,
  topic,
}: {
  pageParam: string | null;
  topic: FeedTopic;
}): Promise<NewsPage> {
  const params = new URLSearchParams({ limit: "30" });
  if (pageParam) params.set("cursor", pageParam);
  if (isCategoryTopic(topic)) params.set("category", topic);
  const response = await fetch(`/api/news?${params}`);
  if (!response.ok) throw new Error("Failed to load news");
  return response.json();
}

function newerThan(latest: NewsPage, headId: string) {
  const items: NewsPage["items"] = [];
  for (const item of latest.items) {
    if (item.id === headId) return { items, capped: false };
    items.push(item);
  }
  return { items, capped: items.length > 0 };
}

export function useTopicNews(
  topic: FeedTopic,
  enabled: boolean,
  scrollRef: RefObject<HTMLElement | null>,
) {
  const queryClient = useQueryClient();
  const enterTimeoutRef = useRef(0);
  const [atTop, setAtTop] = useState(true);
  const [enteringIds, setEnteringIds] = useState<Set<string>>(() => new Set());

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["news", topic],
    queryFn: ({ pageParam }) => fetchNewsPage({ pageParam, topic }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
  });

  const items: NewsPage["items"] = [];
  const seen = new Set<string>();
  for (const item of data?.pages.flatMap((page) => page.items) ?? []) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }
  const headId = items[0]?.id ?? null;

  const { data: latest } = useQuery({
    queryKey: ["news", topic, "latest"],
    queryFn: () => fetchNewsPage({ pageParam: null, topic }),
    enabled: enabled && Boolean(headId),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const pending =
    latest && headId ? newerThan(latest, headId) : { items: [], capped: false };

  function applyLatest(
    page: NewsPage,
    incoming: ReturnType<typeof newerThan>,
  ) {
    if (!incoming.capped && incoming.items.length > 0) {
      setEnteringIds(new Set(incoming.items.map((item) => item.id)));
      window.clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = window.setTimeout(
        () => setEnteringIds(new Set()),
        400,
      );
    }

    queryClient.setQueryData<InfiniteData<NewsPage, string | null>>(
      ["news", topic],
      {
        pages: [page],
        pageParams: [null],
      },
    );
  }

  useEffect(() => {
    return () => window.clearTimeout(enterTimeoutRef.current);
  }, []);

  useEffect(() => {
    const current = scrollRef.current;
    if (!current) return;
    const node: HTMLElement = current;

    function onScroll() {
      const next = node.scrollTop < 8;
      setAtTop((state) => (state === next ? state : next));
    }

    onScroll();
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [scrollRef, enabled]);

  useEffect(() => {
    if (!atTop || !latest || !headId) return;
    const incoming = newerThan(latest, headId);
    if (incoming.items.length === 0) return;
    applyLatest(latest, incoming);
  }, [atTop, headId, latest]);

  return {
    applyLatest,
    atTop,
    enteringIds,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isFetchingNextPage,
    items,
    latest,
    pending,
  };
}
