import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { NewsPage } from "@shared/types";

import { Loading } from "@/components/loading";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";

import { MarketBanner } from "./market-banner";
import { TitleWithTickers } from "./title-with-tickers";

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
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  if (date.toDateString() === now.toDateString()) return time;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString())
    return `yesterday ${time}`;

  const day = date.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
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

function useElementHeight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => setHeight(node.getBoundingClientRect().height);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, height] as const;
}

export function FeedPage() {
  const queryClient = useQueryClient();
  const [headerRef, headerHeight] = useElementHeight<HTMLElement>();
  const [footerRef, footerHeight] = useElementHeight<HTMLElement>();
  const enterTimeoutRef = useRef(0);
  const [atTop, setAtTop] = useState(true);
  const [enteringIds, setEnteringIds] = useState<Set<string>>(() => new Set());
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

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

  const pending =
    latest && headId ? newerThan(latest, headId) : { items: [], capped: false };

  function applyLatest(page: NewsPage, incoming: ReturnType<typeof newerThan>) {
    if (!incoming.capped && incoming.items.length > 0) {
      setEnteringIds(new Set(incoming.items.map((item) => item.id)));
      window.clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = window.setTimeout(
        () => setEnteringIds(new Set()),
        400,
      );
    }

    queryClient.setQueryData<InfiniteData<NewsPage, string | null>>(["news"], {
      pages: [page],
      pageParams: [null],
    });
  }

  useEffect(() => {
    return () => window.clearTimeout(enterTimeoutRef.current);
  }, []);

  useEffect(() => {
    function onScroll() {
      const next = window.scrollY < 8;
      setAtTop((current) => (current === next ? current : next));
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!atTop || !latest || !headId) return;
    const incoming = newerThan(latest, headId);
    if (incoming.items.length === 0) return;
    applyLatest(latest, incoming);
  }, [atTop, headId, latest]);

  const sentinelRef = useIntersectionObserver<HTMLLIElement>(
    () => {
      void fetchNextPage();
    },
    {
      enabled: Boolean(hasNextPage) && !isFetchingNextPage,
    },
  );

  const pendingLabel = pending.capped
    ? `${pending.items.length}+ new`
    : `${pending.items.length} new`;

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor)
      themeColor.setAttribute("content", next ? "#111111" : "#ffffff");
  }

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-20 bg-background"
        ref={headerRef}
      >
        <div className="mx-auto w-full max-w-5xl px-6 pt-6 pb-4">
          <p className="text-sm">Situation</p>
          <div className="mt-4">
            <MarketBanner />
          </div>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-5xl px-6"
        style={{
          paddingTop: headerHeight || undefined,
          paddingBottom: footerHeight || undefined,
        }}
      >
        <div className="pb-6">
          {isError ? (
            <p className="text-sm text-muted-foreground">
              Could not load the feed.
            </p>
          ) : null}

          {!isError && items.length === 0 && isFetching ? <Loading /> : null}

          {!isError && items.length === 0 && !isFetching ? (
            <p className="text-sm text-muted-foreground">
              No articles yet. Waiting on the next ingest.
            </p>
          ) : null}

          {!isError && items.length > 0 ? (
            <>
              {!atTop && pending.items.length > 0 ? (
                <button
                  className="sticky z-10 mb-2 bg-background text-sm text-blue-600"
                  onClick={() => {
                    if (!latest) return;
                    applyLatest(latest, pending);
                    window.scrollTo({ top: 0 });
                  }}
                  style={{ top: (headerHeight || 0) + 8 }}
                  type="button"
                >
                  {pendingLabel}
                </button>
              ) : null}
              <ul>
                {items.map((item) => (
                  <li
                    className={cn(
                      "py-2 text-sm",
                      enteringIds.has(item.id) &&
                        "animate-in fade-in duration-300",
                    )}
                    key={item.id}
                  >
                    <a
                      className="whitespace-nowrap text-muted-foreground tabular-nums hover:text-blue-600"
                      href={item.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <time dateTime={item.publishedAt}>
                        {formatTime(item.publishedAt)}
                      </time>
                      {" -"}
                    </a>{" "}
                    <TitleWithTickers
                      tickers={item.tickers ?? []}
                      title={item.title}
                      url={item.url}
                    />
                    {" - "}
                    <a
                      className="text-muted-foreground hover:text-blue-600"
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
        </div>
      </main>

      <footer
        className="fixed inset-x-0 bottom-0 z-20 bg-background"
        ref={footerRef}
      >
        <div className="mx-auto flex w-full max-w-5xl items-baseline justify-between gap-4 px-6 py-4">
          <p className="text-sm text-muted-foreground">
            What's happening. That's it.
          </p>
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            type="button"
          >
            {dark ? "light" : "dark"}
          </button>
        </div>
      </footer>
    </>
  );
}
