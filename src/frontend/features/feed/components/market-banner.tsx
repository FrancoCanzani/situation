import { useQuery } from "@tanstack/react-query";

import type { MarketBanner as MarketBannerData, MarketBannerItem } from "@shared/types";

import { cn } from "@/lib/utils";

async function fetchBanner(): Promise<MarketBannerData> {
  const response = await fetch("/api/market/banner");
  if (!response.ok) throw new Error("banner failed");
  return response.json();
}

function formatChange(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value).toFixed(1);
  return value > 0 ? `+${abs}%` : value < 0 ? `−${abs}%` : `${abs}%`;
}

function changeClass(value: number | null) {
  if (value == null || !Number.isFinite(value)) return undefined;
  if (value > 0) return "text-green-600";
  if (value < 0) return "text-red-600";
  return undefined;
}

function Track({
  duplicate,
  items,
}: {
  duplicate?: boolean;
  items: MarketBannerItem[];
}) {
  return (
    <ul
      aria-hidden={duplicate || undefined}
      className={cn("flex shrink-0 gap-8 pr-8", duplicate && "motion-reduce:hidden")}
    >
      {items.map((item) => (
        <li className="flex shrink-0 gap-2 text-sm tabular-nums" key={item.id}>
          <span className="text-muted-foreground">{item.label}</span>
          <span className={changeClass(item.changePercent)}>
            {formatChange(item.changePercent)}
          </span>
        </li>
      ))}
    </ul>
  );
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
    <div
      className={cn(
        "overflow-hidden motion-reduce:overflow-x-auto",
        "[mask-image:linear-gradient(to_right,transparent,black_1.5rem,black_calc(100%-1.5rem),transparent)]",
        "[-webkit-mask-image:linear-gradient(to_right,transparent,black_1.5rem,black_calc(100%-1.5rem),transparent)]",
      )}
    >
      <div className="flex w-max animate-tape hover:[animation-play-state:paused] motion-reduce:animate-none">
        <Track items={data.items} />
        <Track duplicate items={data.items} />
      </div>
    </div>
  );
}
