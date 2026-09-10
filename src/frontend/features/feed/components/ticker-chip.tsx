import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { MarketQuote } from "@shared/types";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

async function fetchQuote(symbol: string): Promise<MarketQuote> {
  const response = await fetch(
    `/api/market/quote?symbol=${encodeURIComponent(symbol)}`,
  );
  if (!response.ok) throw new Error("quote failed");
  return response.json();
}

function formatPrice(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: value >= 1000 ? 0 : 2,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  });
}

function formatChange(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "";
  const abs = Math.abs(value).toFixed(1);
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${abs}%`;
}

function changeClass(value: number | null) {
  if (value == null || !Number.isFinite(value) || value === 0) {
    return "text-background/60";
  }
  if (value > 0) return "text-green-500";
  return "text-red-500";
}

function Sparkline({
  points,
  className,
}: {
  points: number[];
  className?: string;
}) {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const width = 96;
  const height = 24;
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point - min) / span) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden
      className={cn("mt-1 block", className)}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function TickerChip({
  symbol,
  label,
}: {
  symbol: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const { data, isFetching, isFetched } = useQuery({
    queryKey: ["market", "quote", symbol],
    queryFn: () => fetchQuote(symbol),
    enabled: open,
    staleTime: 60_000,
  });

  return (
    <HoverCard onOpenChange={setOpen} open={open}>
      <HoverCardTrigger
        className="font-bold text-blue-600"
        closeDelay={100}
        delay={200}
        render={<span />}
      >
        {label}
      </HoverCardTrigger>
      <HoverCardContent
        className="w-auto max-w-56 bg-foreground p-2 text-background ring-0"
        side="top"
        sideOffset={6}
      >
        <span className="block tabular-nums">
          {symbol}{" "}
          {data ? (
            <>
              {formatPrice(data.price)}{" "}
              <span className={changeClass(data.changePercent)}>
                {formatChange(data.changePercent)}
              </span>
            </>
          ) : isFetching ? (
            <span className="text-background/60">…</span>
          ) : isFetched ? (
            <span className="text-background/60">—</span>
          ) : null}
        </span>
        {data?.points?.length ? (
          <Sparkline
            className={changeClass(data.changePercent)}
            points={data.points}
          />
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}
