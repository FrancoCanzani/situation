import type { NewsSource } from "@shared/types";

import { cn } from "@/lib/utils";

export function SourceList({
  sources,
  className,
  showTime,
  formatTime,
}: {
  sources: NewsSource[];
  className?: string;
  showTime?: boolean;
  formatTime?: (iso: string) => string;
}) {
  return (
    <ul className={cn("flex flex-col gap-0.5", className)}>
      {sources.map((source) => (
        <li key={source.id}>
          <a
            className="block rounded-md px-2 py-1.5 hover:bg-muted"
            href={source.url}
            rel="noreferrer"
            target="_blank"
          >
            <span className="block text-muted-foreground">
              {source.sourceName}
              {showTime && formatTime ? (
                <>
                  {" · "}
                  <time dateTime={source.publishedAt}>
                    {formatTime(source.publishedAt)}
                  </time>
                </>
              ) : null}
            </span>
            <span className="block text-foreground">{source.title}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
