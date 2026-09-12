import { Hono } from "hono";

import type { MarketBanner } from "../../shared/types";
import { BANNER_SYMBOLS } from "../market/banner";
import { cachedJson } from "../market/cache";
import { fetchYahooChart } from "../market/yahoo";

const BANNER_TTL_S = 90;

export const marketRoutes = new Hono<{ Bindings: CloudflareBindings }>();

marketRoutes.get("/banner", async (c) => {
  const payload = await cachedJson<MarketBanner>("market:banner", BANNER_TTL_S, async () => {
    const items = await Promise.all(
      BANNER_SYMBOLS.map(async (entry) => {
        try {
          const quote = await fetchYahooChart(entry.yahoo, "1d", "15m");
          return {
            id: entry.id,
            label: entry.label,
            changePercent: quote.changePercent,
          };
        } catch {
          return { id: entry.id, label: entry.label, changePercent: null };
        }
      }),
    );
    return { items, asOf: new Date().toISOString() };
  });

  return c.json(payload, 200, {
    "Cache-Control": `public, max-age=${BANNER_TTL_S}`,
  });
});
