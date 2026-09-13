import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { NewsDetail } from "@shared/types";

import { Loading } from "@/components/loading";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

import { SourceList } from "./source-list";

async function fetchNewsDetail(id: string): Promise<NewsDetail> {
  const response = await fetch(`/api/news/${id}`);
  if (!response.ok) throw new Error("Failed to load sources");
  return response.json();
}

function sourceLabel(names: string[]): string {
  const primary = names[0] ?? "Source";
  if (names.length <= 1) return primary;
  return `${primary} + others`;
}

export function SourceCitation({
  eventId,
  sourceNames,
  className,
}: {
  eventId: string;
  sourceNames: string[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const detailQuery = useQuery({
    queryKey: ["news", eventId, "sources"],
    queryFn: () => fetchNewsDetail(eventId),
    enabled: open,
    staleTime: 60_000,
  });

  return (
    <HoverCard onOpenChange={setOpen} open={open}>
      <HoverCardTrigger
        className={cn(
          "inline text-muted-foreground hover:text-foreground",
          className,
        )}
        closeDelay={100}
        delay={200}
        onClick={(event) => event.stopPropagation()}
        render={<button type="button" />}
      >
        {sourceLabel(sourceNames)}
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-64 p-1" side="top" sideOffset={6}>
        {detailQuery.isLoading ? (
          <div className="px-2 py-1.5">
            <Loading />
          </div>
        ) : detailQuery.isError ? (
          <p className="px-2 py-1.5 text-muted-foreground">
            Could not load sources.
          </p>
        ) : (
          <SourceList sources={detailQuery.data?.sources ?? []} />
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
