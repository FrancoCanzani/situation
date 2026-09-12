import { useState } from "react";

import type { NewsItem } from "@shared/types";

import { cn } from "@/lib/utils";

import { EventDialog } from "./event-dialog";
import { SourceCitation } from "./source-citation";

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

export function NewsRow({
  item,
  entering,
}: {
  item: NewsItem;
  entering: boolean;
}) {
  const [open, setOpen] = useState(false);
  const when = item.bumpedAt || item.lastSeenAt;

  return (
    <li
      className={cn(
        "py-2.5 text-sm",
        entering && "animate-in fade-in duration-300",
      )}
    >
      <div
        className="cursor-pointer text-left"
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <time
          className="block text-muted-foreground tabular-nums"
          dateTime={when}
        >
          {formatTime(when)}
        </time>
        {item.imageUrl ? (
          <img
            alt=""
            className="mt-2 aspect-[16/9] w-full object-cover"
            loading="lazy"
            src={item.imageUrl}
          />
        ) : null}
        <div className="mt-0.5">{item.title}</div>
      </div>
      <div className="mt-0.5">
        <SourceCitation eventId={item.id} sourceNames={item.sourceNames} />
      </div>
      <EventDialog item={item} onClose={() => setOpen(false)} open={open} />
    </li>
  );
}
