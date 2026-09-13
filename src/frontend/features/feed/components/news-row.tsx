import { useState } from "react";

import type { NewsItem } from "@shared/types";

import { countryName } from "@/lib/country-name";
import { cn } from "@/lib/utils";

import { EventDialog } from "./event-dialog";
import { NewsDevInfo } from "./news-dev-info";
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
  const country = countryName(item.countryCode);

  return (
    <li
      className={cn(
        "rounded bg-muted/35 p-2 text-sm hover:bg-muted",
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
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          {country ? <span className="font-medium">{country}</span> : <span />}
          <div className="flex items-center gap-1">
            <NewsDevInfo item={item} />
            <time
              className="block font-mono text-xs tabular-nums"
              dateTime={when}
            >
              {formatTime(when)}
            </time>
          </div>
        </div>
        {item.imageUrl ? (
          <img
            alt=""
            className="my-1 aspect-video w-full rounded object-cover"
            loading="lazy"
            src={item.imageUrl}
          />
        ) : null}
        <p className="mt-0.5">
          <span>{item.title} </span>
          <SourceCitation eventId={item.id} sourceNames={item.sourceNames} />
        </p>
      </div>
      <EventDialog item={item} onClose={() => setOpen(false)} open={open} />
    </li>
  );
}
