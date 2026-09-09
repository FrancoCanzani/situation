import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";

import type { MarketQuote } from "@shared/types";

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

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const width = 96;
  const height = 28;
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
      className="mt-1 block text-neutral-500"
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
  name,
}: {
  symbol: string;
  name: string;
}) {
  const tipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const { data } = useQuery({
    queryKey: ["market", "quote", symbol],
    queryFn: () => fetchQuote(symbol),
    enabled: open,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

  return (
    <span
      className="relative inline-block"
      onBlur={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        aria-describedby={open ? tipId : undefined}
        className="font-bold text-inherit hover:text-blue-600"
        ref={buttonRef}
        type="button"
      >
        #{symbol}
      </button>
      {open ? (
        <span
          className="fixed z-30 w-40 bg-background py-2 text-left text-sm text-neutral-500"
          id={tipId}
          role="tooltip"
          style={{ top: pos.top, left: pos.left }}
        >
          <span className="block text-foreground">{data?.name ?? name}</span>
          <span className="block tabular-nums">
            {formatPrice(data?.price ?? null)}
            {data?.changePercent != null
              ? ` (${formatChange(data.changePercent)})`
              : null}
          </span>
          <Sparkline points={data?.points ?? []} />
        </span>
      ) : null}
    </span>
  );
}
