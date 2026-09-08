import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";

import type { NewsPage } from "@shared/types";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

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
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function Feed() {
  const query = useInfiniteQuery({
    queryKey: ["news"],
    queryFn: fetchNewsPage,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-4 py-5 antialiased">
      <header className="mb-2 flex items-baseline justify-between gap-4 border-b border-border pb-2">
        <h1>Situation</h1>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground disabled:opacity-40"
          disabled={query.isFetching}
          onClick={() => {
            void query.refetch();
          }}
        >
          Refresh
        </button>
      </header>

      {query.isError ? (
        <p className="py-2 text-muted-foreground">Could not load the feed.</p>
      ) : null}

      {!query.isError && items.length === 0 && !query.isFetching ? (
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
                {formatTime(item.publishedAt)}
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

      <div className="mt-4 pb-10 text-center text-muted-foreground">
        {query.hasNextPage ? (
          <button
            type="button"
            className="hover:text-foreground disabled:opacity-40"
            disabled={query.isFetchingNextPage}
            onClick={() => {
              void query.fetchNextPage();
            }}
          >
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        ) : items.length > 0 ? (
          <span>End of feed</span>
        ) : null}
      </div>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Feed />
    </QueryClientProvider>
  );
}
