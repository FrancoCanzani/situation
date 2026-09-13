import { Bug } from "lucide-react";
import { useState } from "react";

import type { NewsItem } from "@shared/types";

import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 tabular-nums">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export function NewsDevInfo({ item }: { item: NewsItem }) {
  const [copied, setCopied] = useState(false);

  if (!import.meta.env.DEV) return null;

  const payload = {
    id: item.id,
    title: item.title,
    importance: item.importance,
    confidence: item.confidence,
    category: item.category,
    sentiment: item.sentiment,
    countryCode: item.countryCode,
    sourceCount: item.sourceCount,
    sourceNames: item.sourceNames,
    updated: item.updated,
    firstSeenAt: item.firstSeenAt,
    bumpedAt: item.bumpedAt,
  };

  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      console.log("[dev]", payload);
    }
  }

  return (
    <HoverCard>
      <HoverCardTrigger
        className="text-muted-foreground hover:text-foreground"
        closeDelay={100}
        delay={150}
        onClick={(event) => event.stopPropagation()}
        render={
          <Button
            aria-label="Dev info"
            size="icon-xs"
            type="button"
            variant="ghost"
          />
        }
      >
        <Bug />
      </HoverCardTrigger>
      <HoverCardContent
        align="end"
        className="w-56 p-2 font-mono text-[11px]"
        side="bottom"
        sideOffset={6}
      >
        <div
          className="flex flex-col gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          <Row label="importance" value={String(item.importance ?? "—")} />
          <Row label="confidence" value={String(item.confidence)} />
          <Row label="category" value={item.category ?? "—"} />
          <Row label="sentiment" value={item.sentiment ?? "—"} />
          <Row label="country" value={item.countryCode ?? "—"} />
          <Row label="sources" value={String(item.sourceCount)} />
          <Row label="updated" value={item.updated ? "yes" : "no"} />
          <Row label="id" value={item.id.slice(0, 8)} />
          <Button
            className="mt-1 w-full"
            onClick={() => void copy()}
            size="xs"
            type="button"
            variant="outline"
          >
            {copied ? "Copied" : "Copy JSON"}
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
