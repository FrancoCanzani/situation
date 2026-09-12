import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { NewsDetail } from "@shared/types";

import { Loading } from "@/components/loading";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";

async function fetchNewsDetail(id: string): Promise<NewsDetail> {
  const response = await fetch(`/api/news/${id}`);
  if (!response.ok) throw new Error("Failed to load sources");
  return response.json();
}

export function SourceCitation({
  eventId,
  sourceNames,
}: {
  eventId: string;
  sourceNames: string[];
}) {
  const [open, setOpen] = useState(false);
  const detailQuery = useQuery({
    queryKey: ["news", eventId, "sources"],
    queryFn: () => fetchNewsDetail(eventId),
    enabled: open,
    staleTime: 60_000,
  });

  const label = sourceNames[0] ?? "Source";

  return (
    <HoverCard onOpenChange={setOpen} open={open}>
      <HoverCardTrigger
        className="text-muted-foreground hover:text-blue-600"
        closeDelay={100}
        delay={200}
        onClick={(event) => event.stopPropagation()}
        render={<button type="button" />}
      >
        {label}
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-56 p-2" side="top" sideOffset={6}>
        {detailQuery.isLoading ? (
          <Loading />
        ) : detailQuery.isError ? (
          <p className="text-muted-foreground">Could not load sources.</p>
        ) : (
          <ul className="space-y-2">
            {detailQuery.data?.sources.map((source) => (
              <li key={source.id}>
                <a
                  className="block hover:text-blue-600"
                  href={source.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="block text-muted-foreground">
                    {source.sourceName}
                  </span>
                  <span className="block text-foreground">{source.title}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
