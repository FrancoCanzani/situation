export const BANNER_SYMBOLS = [
  { id: "spx", label: "SPX", yahoo: "^GSPC" },
  { id: "ndx", label: "NDX", yahoo: "^IXIC" },
  { id: "eur", label: "EUR", yahoo: "EURUSD=X" },
  { id: "oil", label: "Oil", yahoo: "CL=F" },
  { id: "gold", label: "Gold", yahoo: "GC=F" },
  { id: "btc", label: "BTC", yahoo: "BTC-USD" },
] as const;

export type BannerSymbol = (typeof BANNER_SYMBOLS)[number];
