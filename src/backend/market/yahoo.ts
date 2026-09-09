const YAHOO_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json,text/plain,*/*",
};

type ChartMeta = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
};

type ChartResult = {
  meta?: ChartMeta;
  timestamp?: number[];
  indicators?: {
    quote?: Array<{ close?: Array<number | null> }>;
  };
};

type SearchQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchDisp?: string;
};

export type YahooQuote = {
  symbol: string;
  name: string;
  price: number | null;
  previousClose: number | null;
  changePercent: number | null;
  points: number[];
};

export type YahooSearchHit = {
  symbol: string;
  name: string;
  type: string;
};

function changePercent(price: number | null, previous: number | null) {
  if (price == null || previous == null || previous === 0) return null;
  return ((price - previous) / previous) * 100;
}

function closesFromChart(result: ChartResult): number[] {
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  return closes.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

export async function fetchYahooChart(
  symbol: string,
  range = "1d",
  interval = "5m",
): Promise<YahooQuote> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=${range}&interval=${interval}&includePrePost=false`;
  const response = await fetch(url, {
    headers: YAHOO_HEADERS,
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`yahoo chart HTTP ${response.status}`);

  const data = (await response.json()) as {
    chart?: { result?: ChartResult[]; error?: unknown };
  };
  const result = data.chart?.result?.[0];
  if (!result?.meta) throw new Error(`yahoo chart empty for ${symbol}`);

  const meta = result.meta;
  const points = closesFromChart(result);
  const price =
    typeof meta.regularMarketPrice === "number"
      ? meta.regularMarketPrice
      : (points[points.length - 1] ?? null);
  const previousClose =
    typeof meta.chartPreviousClose === "number"
      ? meta.chartPreviousClose
      : typeof meta.previousClose === "number"
        ? meta.previousClose
        : null;

  return {
    symbol: meta.symbol || symbol,
    name: meta.shortName || meta.longName || meta.symbol || symbol,
    price,
    previousClose,
    changePercent: changePercent(price, previousClose),
    points,
  };
}

export async function searchYahoo(query: string): Promise<YahooSearchHit[]> {
  const url =
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}` +
    `&quotesCount=8&newsCount=0`;
  const response = await fetch(url, {
    headers: YAHOO_HEADERS,
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) return [];

  const data = (await response.json()) as { quotes?: SearchQuote[] };
  return (data.quotes ?? [])
    .map((quote) => ({
      symbol: (quote.symbol ?? "").trim().toUpperCase(),
      name: (quote.shortname || quote.longname || quote.symbol || "").trim(),
      type: (quote.quoteType ?? "").toUpperCase(),
    }))
    .filter((hit) => hit.symbol.length > 0);
}
