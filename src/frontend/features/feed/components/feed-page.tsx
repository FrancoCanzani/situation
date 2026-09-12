import { useEffect, useRef } from "react";

import { FEED_TOPICS } from "../lib/topics";
import { FeedHeader } from "./feed-header";
import { MarketBanner } from "./market-banner";
import { TopicColumn } from "./topic-column";

export function FeedPage() {
  const deckRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = deckRef.current;
    if (!scroller) return;

    const onWheel = (event: WheelEvent) => {
      let dx = event.deltaX;
      if (event.shiftKey && Math.abs(event.deltaY) > Math.abs(dx)) {
        dx = event.deltaY;
      }
      // Columns own vertical overflow; without this the deck never sees sideways gestures.
      if (Math.abs(dx) <= Math.abs(event.deltaY) && !event.shiftKey) return;
      if (dx === 0) return;
      event.preventDefault();
      scroller.scrollLeft += dx;
    };

    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      scroller.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <FeedHeader />
      <div
        className="flex min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-hidden overscroll-x-contain md:overflow-x-auto"
        ref={deckRef}
      >
        {FEED_TOPICS.map((topic) => (
          <TopicColumn
            deckRef={deckRef}
            eager={topic === "all"}
            key={topic}
            topic={topic}
          />
        ))}
      </div>
      <MarketBanner />
    </div>
  );
}
