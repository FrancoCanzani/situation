import { useEffect, useRef, useState, type RefObject } from "react";

import { Loading } from "@/components/loading";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { topicLabel, type FeedTopic } from "../lib/topics";
import { useTopicNews } from "../lib/use-topic-news";
import { AllCatsFilter } from "./all-cats-filter";
import { NewsRow } from "./news-row";

export function TopicColumn({
  topic,
  deckRef,
  eager,
  soloOnMobile,
}: {
  topic: FeedTopic;
  deckRef: RefObject<HTMLDivElement | null>;
  eager: boolean;
  soloOnMobile: boolean;
}) {
  const scrollRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (visible) return;
    const node = scrollRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { root: deckRef.current, rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [deckRef, visible]);

  const {
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
  } = useTopicNews(topic, visible, scrollRef);

  const sentinelRef = useIntersectionObserver<HTMLLIElement>(
    () => {
      void fetchNextPage();
    },
    {
      enabled: visible && Boolean(hasNextPage) && !isFetchingNextPage,
      rootRef: scrollRef,
    },
  );

  const pendingLabel = pending.capped
    ? `${pending.items.length}+ new`
    : `${pending.items.length} new`;

  return (
    <section
      className={cn(
        "h-full min-h-0 shrink-0 flex-col overflow-x-hidden overflow-y-auto overscroll-contain border-r scrollbar-none",
        soloOnMobile ? "flex w-full md:w-80" : "hidden w-80 md:flex",
      )}
      id={`column-${topic}`}
      ref={scrollRef}
    >
      <header
        className={cn(
          "sticky top-0 z-20 items-center justify-between gap-2 bg-background px-4 pt-3 pb-2",
          topic === "all" ? "hidden md:flex" : "hidden md:block",
        )}
      >
        <span className="text-sm">{topicLabel(topic)}</span>
        {topic === "all" ? <AllCatsFilter /> : null}
      </header>

      {isError ? (
        <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 pb-6 text-center">
          <p className="text-sm text-muted-foreground">
            Could not load the feed.
          </p>
        </div>
      ) : null}

      {!isError && items.length === 0 && isFetching ? (
        <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 pb-6">
          <Loading />
        </div>
      ) : null}

      {!isError && items.length === 0 && !isFetching && visible ? (
        <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-1 px-4 pb-6 text-center">
          <p className="text-sm">Quiet for now.</p>
          <p className="text-sm text-muted-foreground">
            Check back when something happens.
          </p>
        </div>
      ) : null}

      {!isError && items.length > 0 ? (
        <div className="px-2 pb-6">
          {!atTop && pending.items.length > 0 ? (
            <div className="pointer-events-none sticky top-3 z-30 mb-0 flex h-0 justify-center md:top-12">
              <Button
                className={cn(
                  "pointer-events-auto rounded-full bg-primary px-3 text-primary-foreground shadow-md",
                  "animate-in fade-in slide-in-from-top-3 duration-200",
                )}
                onClick={() => {
                  if (!latest) return;
                  applyLatest(latest, pending);
                  scrollRef.current?.scrollTo({ top: 0 });
                }}
                type="button"
              >
                {pendingLabel}
              </Button>
            </div>
          ) : null}
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <NewsRow
                entering={enteringIds.has(item.id)}
                item={item}
                key={item.id}
              />
            ))}
            {hasNextPage ? <li ref={sentinelRef} className="h-8" /> : null}
            {isFetchingNextPage ? (
              <li>
                <Loading />
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
