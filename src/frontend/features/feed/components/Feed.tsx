import { useInfiniteQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useMemo } from "react";

import type { NewsPage } from "@shared/types";

import { Loading } from "@/components/Loading";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

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

export function Feed() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["news"],
    queryFn: fetchNewsPage,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  const sentinelRef = useIntersectionObserver(
    () => {
      void fetchNextPage();
    },
    {
      enabled: Boolean(hasNextPage) && !isFetchingNextPage,
      rootMargin: "400px 0px",
    },
  );

  return (
    <>
      <header className="mb-2 flex items-baseline justify-between gap-4 border-b border-border pb-2">
        <h1>Situation</h1>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground disabled:opacity-40"
          disabled={isFetching}
          onClick={() => {
            void refetch();
          }}
        >
          Refresh
        </button>
      </header>

      {isError ? (
        <p className="py-2 text-muted-foreground">Could not load the feed.</p>
      ) : null}

      {!isError && items.length === 0 && isFetching ? <Loading /> : null}

      {!isError && items.length === 0 && !isFetching ? (
        <p className="py-2 text-muted-foreground">
          No articles yet. Waiting on the next cron ingest.
        </p>
      ) : null}

      <ul>
        {items.map((item) => (
          <li key={item.id} className="border-b border-border">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="-mx-4 flex items-baseline gap-4 px-4 py-1.5 hover:bg-black/[0.03]"
            >
              <span className="font-nums w-[7.25rem] shrink-0 text-muted-foreground">
                {format(parseISO(item.publishedAt), "MM-dd HH:mm")}
              </span>
              <span className="w-16 shrink-0 truncate text-muted-foreground">
                {item.category}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              <span className="max-w-36 shrink-0 truncate text-right text-muted-foreground">
                {item.sourceName}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <div
        ref={sentinelRef}
        className="mt-4 pb-10 text-center text-muted-foreground"
      >
        {isFetchingNextPage ? <Loading /> : null}
        {!hasNextPage && items.length > 0 ? "End of feed" : null}
      </div>
    </>
  );
}
