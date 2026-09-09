import { useQuery } from "@tanstack/react-query";

import type { MarketBanner } from "@shared/types";

async function fetchBanner(): Promise<MarketBanner> {
  const response = await fetch("/api/market/banner");
  if (!response.ok) throw new Error("banner failed");
  return response.json();
}

function formatChange(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value).toFixed(1);
  return value > 0 ? `+${abs}%` : value < 0 ? `−${abs}%` : `${abs}%`;
}

export function MarketBanner() {
  const { data } = useQuery({
    queryKey: ["market", "banner"],
    queryFn: fetchBanner,
    refetchInterval: 180_000,
    refetchOnWindowFocus: true,
    staleTime: 90_000,
  });

  if (!data?.items.length) return null;

  return (
    <p className="pt-2 text-sm text-neutral-500 tabular-nums">
      {data.items.map((item, index) => (
        <span key={item.id}>
          {index > 0 ? " · " : null}
          {item.label} {formatChange(item.changePercent)}
        </span>
      ))}
    </p>
  );
}
