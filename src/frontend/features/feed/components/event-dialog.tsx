import { useQuery } from "@tanstack/react-query";

import type { NewsDetail, NewsItem } from "@shared/types";

import { Loading } from "@/components/loading";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

async function fetchNewsDetail(id: string): Promise<NewsDetail> {
  const response = await fetch(`/api/news/${id}`);
  if (!response.ok) throw new Error("Failed to load event");
  return response.json();
}

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
  if (date.toDateString() === yesterday.toDateString()) {
    return `yesterday ${time}`;
  }

  const day = date.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
  return `${day} ${time}`;
}

export function EventDialog({
  item,
  open,
  onClose,
}: {
  item: NewsItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const detailQuery = useQuery({
    queryKey: ["news", item?.id, "detail"],
    queryFn: () => fetchNewsDetail(item!.id),
    enabled: open && Boolean(item?.id),
    staleTime: 60_000,
  });

  const detail = detailQuery.data;
  const title = detail?.title ?? item?.title ?? "";
  const summary = detail?.summary ?? item?.summary ?? "";
  const sources = detail?.sources ?? [];
  const when = detail?.bumpedAt ?? item?.bumpedAt ?? item?.lastSeenAt ?? "";
  const imageUrl = detail?.imageUrl ?? item?.imageUrl;

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      open={open}
    >
      <DialogContent className="max-h-[min(40rem,90svh)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-bold leading-snug">{title}</DialogTitle>
          <DialogDescription>
            {item?.updated ? "Updated · " : null}
            {when ? formatTime(when) : null}
          </DialogDescription>
        </DialogHeader>

        {imageUrl ? (
          <img
            alt=""
            className="aspect-[16/9] w-full object-cover"
            src={imageUrl}
          />
        ) : null}

        {summary ? <p>{summary}</p> : null}

        <div>
          <p className="mb-2 text-muted-foreground">Developments</p>
          {detailQuery.isLoading ? (
            <Loading />
          ) : detailQuery.isError ? (
            <p className="text-muted-foreground">Could not load sources.</p>
          ) : sources.length === 0 ? (
            <p className="text-muted-foreground">No sources yet.</p>
          ) : (
            <ol className="space-y-3">
              {sources.map((source) => (
                <li key={source.id}>
                  <time
                    className="block text-muted-foreground tabular-nums"
                    dateTime={source.publishedAt}
                  >
                    {formatTime(source.publishedAt)}
                  </time>
                  <a
                    className="mt-0.5 block hover:text-blue-600"
                    href={source.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="block">{source.title}</span>
                    <span className="block text-muted-foreground">
                      {source.sourceName}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
