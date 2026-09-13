import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import {
  mobileTopic,
  parseCols,
  type FeedTopic,
} from "../lib/topics";
import { FeedHeader } from "./feed-header";
import { MarketBanner } from "./market-banner";
import { TopicColumn } from "./topic-column";

const routeApi = getRouteApi("/");

export function FeedPage() {
  const { cols: colsParam } = routeApi.useSearch();
  const cols = parseCols(colsParam);
  const solo = mobileTopic(cols);
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
        {cols.map((topic: FeedTopic) => (
          <TopicColumn
            deckRef={deckRef}
            eager={topic === solo}
            key={topic}
            soloOnMobile={topic === solo}
            topic={topic}
          />
        ))}
      </div>
      <MarketBanner />
    </div>
  );
}
