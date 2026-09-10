export const BANNER_SYMBOLS = [
  { id: "spx", label: "SPX", yahoo: "^GSPC" },
  { id: "ndx", label: "NDX", yahoo: "^IXIC" },
  { id: "rut", label: "RUT", yahoo: "^RUT" },
  { id: "vix", label: "VIX", yahoo: "^VIX" },
  { id: "2y", label: "2Y", yahoo: "2YY=F" },
  { id: "10y", label: "10Y", yahoo: "^TNX" },
  { id: "dxy", label: "DXY", yahoo: "DX-Y.NYB" },
  { id: "eur", label: "EUR", yahoo: "EURUSD=X" },
  { id: "stoxx", label: "Stoxx", yahoo: "^STOXX50E" },
  { id: "nikkei", label: "Nikkei", yahoo: "^N225" },
  { id: "hsi", label: "HSI", yahoo: "^HSI" },
  { id: "oil", label: "Oil", yahoo: "CL=F" },
  { id: "gold", label: "Gold", yahoo: "GC=F" },
  { id: "btc", label: "BTC", yahoo: "BTC-USD" },
] as const;

export type BannerSymbol = (typeof BANNER_SYMBOLS)[number];
