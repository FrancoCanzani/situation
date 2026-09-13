import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useRef, useState, type RefObject } from "react";

import type { Category, FeedSort, NewsPage } from "@shared/types";
import { CATEGORIES } from "@shared/types";

import { isCategoryTopic, parseCats, type FeedTopic } from "./topics";

const routeApi = getRouteApi("/");

async function fetchNewsPage({
  pageParam,
  sort,
  topic,
  cats,
}: {
  pageParam: string | null;
  sort: FeedSort;
  topic: FeedTopic;
  cats: Category[];
}): Promise<NewsPage> {
  const params = new URLSearchParams({ limit: "30", sort });
  if (pageParam) params.set("cursor", pageParam);
  if (isCategoryTopic(topic)) {
    params.set("category", topic);
  } else if (cats.length < CATEGORIES.length) {
    params.set("categories", cats.join(","));
  }
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
  const { sort, cats: catsParam } = routeApi.useSearch();
  const cats = topic === "all" ? parseCats(catsParam) : [...CATEGORIES];
  const catsKey = cats.join(",");
  const queryClient = useQueryClient();
  const enterTimeoutRef = useRef(0);
  const [atTop, setAtTop] = useState(true);
  const [enteringIds, setEnteringIds] = useState<Set<string>>(() => new Set());

  const queryKey = ["news", topic, sort, catsKey] as const;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchNewsPage({ pageParam, sort, topic, cats }),
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
    queryKey: [...queryKey, "latest"],
    queryFn: () => fetchNewsPage({ pageParam: null, sort, topic, cats }),
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
      queryKey,
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
