import { Hono } from "hono";

import type { MarketBanner, MarketQuote } from "../../shared/types";
import { BANNER_SYMBOLS } from "../market/banner";
import { cachedJson } from "../market/cache";
import { fetchYahooChart } from "../market/yahoo";

const BANNER_TTL_S = 90;
const QUOTE_TTL_S = 60;

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

marketRoutes.get("/quote", async (c) => {
  const symbol = (c.req.query("symbol") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9.^*=-]{1,24}$/.test(symbol)) {
    return c.json({ error: "invalid_symbol" }, 400);
  }

  try {
    const payload = await cachedJson<MarketQuote>(
      `market:quote:${symbol}`,
      QUOTE_TTL_S,
      async () => {
        const quote = await fetchYahooChart(symbol, "1d", "5m");
        return {
          symbol: quote.symbol,
          name: quote.name,
          price: quote.price,
          changePercent: quote.changePercent,
          points: quote.points,
          asOf: new Date().toISOString(),
        };
      },
    );
    return c.json(payload, 200, {
      "Cache-Control": `public, max-age=${QUOTE_TTL_S}`,
    });
  } catch {
    return c.json({ error: "unavailable" }, 502);
  }
});
