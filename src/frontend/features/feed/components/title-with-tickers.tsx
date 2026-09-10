import type { ArticleTicker } from "@shared/types";

import { TickerChip } from "./ticker-chip";

type Segment =
  | { type: "text"; value: string }
  | { type: "ticker"; name: string; symbol: string };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function segmentsFor(title: string, tickers: ArticleTicker[]): Segment[] {
  if (tickers.length === 0) return [{ type: "text", value: title }];

  const matches = tickers
    .map((ticker) => {
      const match = new RegExp(`\\b${escapeRegExp(ticker.name)}\\b`, "i").exec(
        title,
      );
      if (!match || match.index == null) return null;
      return {
        index: match.index,
        end: match.index + match[0].length,
        name: match[0],
        symbol: ticker.symbol,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null)
    .sort((a, b) => a.index - b.index);

  if (matches.length === 0) return [{ type: "text", value: title }];

  const segments: Segment[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.index < cursor) continue;
    if (match.index > cursor) {
      segments.push({ type: "text", value: title.slice(cursor, match.index) });
    }
    segments.push({
      type: "text",
      value: match.name,
    });
    segments.push({
      type: "ticker",
      name: match.name,
      symbol: match.symbol,
    });
    cursor = match.end;
  }

  if (cursor < title.length) {
    segments.push({ type: "text", value: title.slice(cursor) });
  }

  return segments;
}

export function TitleWithTickers({
  title,
  tickers,
  url,
}: {
  title: string;
  tickers: ArticleTicker[];
  url: string;
}) {
  const segments = segmentsFor(title, tickers);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === "ticker") {
          return (
            <span key={`t-${segment.symbol}-${index}`}>
              {" "}
              <TickerChip name={segment.name} symbol={segment.symbol} />
            </span>
          );
        }

        if (!segment.value) return null;

        return (
          <a
            className="hover:text-blue-600"
            href={url}
            key={`s-${index}`}
            rel="noreferrer"
            target="_blank"
          >
            {segment.value}
          </a>
        );
      })}
    </>
  );
}
