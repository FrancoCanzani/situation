import { useEffect, useRef, useState, type RefObject } from "react";

import { Loading } from "@/components/loading";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";

import { topicLabel, type FeedTopic } from "../lib/topics";
import { useTopicNews } from "../lib/use-topic-news";
import { NewsRow } from "./news-row";

export function TopicColumn({
  topic,
  deckRef,
  eager,
}: {
  topic: FeedTopic;
  deckRef: RefObject<HTMLDivElement | null>;
  eager: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (visible) return;
    const node = sectionRef.current;
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
        "h-full shrink-0 flex-col border-r",
        topic === "all"
          ? "flex w-full md:w-80"
          : "hidden w-80 md:flex",
      )}
      id={`column-${topic}`}
      ref={sectionRef}
    >
      <header className="hidden shrink-0 px-4 pt-3 pb-2 md:block">
        <p className="text-sm">{topicLabel(topic)}</p>
      </header>
      <div
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-6"
        ref={scrollRef}
      >
        {isError ? (
          <p className="text-sm text-muted-foreground">
            Could not load the feed.
          </p>
        ) : null}

        {!isError && items.length === 0 && isFetching ? (
          <div className="flex h-full items-center justify-center">
            <Loading />
          </div>
        ) : null}

        {!isError && items.length === 0 && !isFetching && visible ? (
          <div className="flex h-full flex-col justify-center gap-1">
            <p className="text-sm">Quiet for now.</p>
            <p className="text-sm text-muted-foreground">
              Check back when something happens.
            </p>
          </div>
        ) : null}

        {!isError && items.length > 0 ? (
          <>
            {!atTop && pending.items.length > 0 ? (
              <button
                className="sticky top-0 z-10 mb-2 w-full bg-background py-1 text-left text-sm text-blue-600"
                onClick={() => {
                  if (!latest) return;
                  applyLatest(latest, pending);
                  scrollRef.current?.scrollTo({ top: 0 });
                }}
                type="button"
              >
                {pendingLabel}
              </button>
            ) : null}
            <ul>
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
          </>
        ) : null}
      </div>
    </section>
  );
}
