import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useRef } from "react";

import type { NewsPage } from "@shared/types";

import { Loading } from "@/components/Loading";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

import { MarketBanner } from "./MarketBanner";
import { TitleWithTickers } from "./TitleWithTickers";

async function fetchNewsPage({
  pageParam,
}: {
  pageParam: string | null;
}): Promise<NewsPage> {
  const params = new URLSearchParams({ limit: "30" });
  if (pageParam) params.set("cursor", pageParam);
  const response = await fetch(`/api/news?${params}`);
  if (!response.ok) throw new Error("Failed to load news");
  return response.json();
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (date.toDateString() === now.toDateString()) return time;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "yesterday";

  const day = date.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${day} ${time}`;
}

function newerThan(latest: NewsPage, headId: string) {
  const items: NewsPage["items"] = [];
  for (const item of latest.items) {
    if (item.id === headId) return { items, capped: false };
    items.push(item);
  }
  return { items, capped: items.length > 0 };
}

export function Feed() {
  const queryClient = useQueryClient();
  const listRef = useRef<HTMLUListElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["news"],
    queryFn: fetchNewsPage,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const headId = items[0]?.id ?? null;

  const { data: latest } = useQuery({
    queryKey: ["news", "latest"],
    queryFn: () => fetchNewsPage({ pageParam: null }),
    enabled: Boolean(headId),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const pending = useMemo(() => {
    if (!latest || !headId) return { items: [], capped: false };
    return newerThan(latest, headId);
  }, [latest, headId]);

  const sentinelRef = useIntersectionObserver<HTMLLIElement>(
    () => {
      void fetchNextPage();
    },
    {
      enabled: Boolean(hasNextPage) && !isFetchingNextPage,
    },
  );

  function reveal() {
    if (!latest || !headId) return;

    queryClient.setQueryData<InfiniteData<NewsPage, string | null>>(
      ["news"],
      (current) => {
        if (!current || pending.capped) {
          return { pages: [latest], pageParams: [null] };
        }

        const [first, ...rest] = current.pages;
        const existing = new Set(first.items.map((item) => item.id));
        const incoming = pending.items.filter((item) => !existing.has(item.id));

        return {
          ...current,
          pages: [{ ...first, items: [...incoming, ...first.items] }, ...rest],
        };
      },
    );

    listRef.current?.scrollTo({ top: 0 });
  }

  const pendingLabel = pending.capped
    ? `${pending.items.length}+ new`
    : `${pending.items.length} new`;

  return (
    <main className="flex h-svh flex-col overflow-hidden p-6">
      <div>
        <p className="text-sm">Situation</p>
        <MarketBanner />
      </div>
      <div className="relative min-h-0 flex-1">
        {isError ? (
          <p className="pt-8 text-sm text-neutral-500">
            Could not load the feed.
          </p>
        ) : null}

        {!isError && items.length === 0 && isFetching ? (
          <div className="pt-8">
            <Loading />
          </div>
        ) : null}

        {!isError && items.length === 0 && !isFetching ? (
          <p className="pt-8 text-sm text-neutral-500">
            No articles yet. Waiting on the next ingest.
          </p>
        ) : null}

        {!isError && items.length > 0 ? (
          <>
            {pending.items.length > 0 ? (
              <button
                className="absolute top-2 z-10 bg-background text-sm text-blue-600"
                onClick={reveal}
                type="button"
              >
                {pendingLabel}
              </button>
            ) : null}
            <ul
              className="absolute inset-0 overflow-y-auto pt-8 pb-8"
              ref={listRef}
            >
              {items.map((item) => (
                <li className="py-2 text-sm" key={item.id}>
                  <time
                    className="text-neutral-500 tabular-nums"
                    dateTime={item.publishedAt}
                  >
                    {formatTime(item.publishedAt)}
                  </time>{" "}
                  <TitleWithTickers
                    tickers={item.tickers ?? []}
                    title={item.title}
                    url={item.url}
                  />
                  {" - "}
                  <a
                    className="text-neutral-500 hover:text-blue-600"
                    href={item.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {item.sourceName}
                  </a>
                </li>
              ))}
              {hasNextPage ? <li ref={sentinelRef} className="h-8" /> : null}
              {isFetchingNextPage ? (
                <li>
                  <Loading />
                </li>
              ) : null}
            </ul>
          </>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/70 to-transparent" />
      </div>
      <p className="relative z-10 max-w-md pt-4 text-sm text-neutral-500">
        What's happening. That's it.
      </p>
    </main>
  );
}
