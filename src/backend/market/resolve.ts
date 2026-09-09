import type { ArticleTicker } from "../../shared/types";
import { searchYahoo } from "./yahoo";

export type Mention = {
  name: string;
  ticker?: string;
};

const ALLOWED_TYPES = new Set(["EQUITY", "ETF", "CRYPTOCURRENCY"]);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function nameInTitle(title: string, name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  return new RegExp(`\\b${escapeRegExp(trimmed)}\\b`, "i").test(title);
}

function pickHit(
  hits: Awaited<ReturnType<typeof searchYahoo>>,
  preferredSymbol?: string,
) {
  const preferred = preferredSymbol?.trim().toUpperCase();
  if (preferred) {
    const exact = hits.find((hit) => hit.symbol === preferred);
    if (exact && (ALLOWED_TYPES.has(exact.type) || exact.type === "")) return exact;
  }

  return (
    hits.find((hit) => ALLOWED_TYPES.has(hit.type)) ??
    hits.find((hit) => hit.type === "") ??
    null
  );
}

export async function resolveMentions(
  title: string,
  mentions: Mention[],
): Promise<ArticleTicker[]> {
  const out: ArticleTicker[] = [];
  const seen = new Set<string>();

  for (const mention of mentions.slice(0, 3)) {
    const name = mention.name.trim();
    if (!name || !nameInTitle(title, name)) continue;

    try {
      const query = mention.ticker?.trim() || name;
      const hits = await searchYahoo(query);
      const hit = pickHit(hits, mention.ticker);
      if (!hit || seen.has(hit.symbol)) continue;
      seen.add(hit.symbol);
      out.push({ symbol: hit.symbol, name });
    } catch {
      // skip unresolved mention
    }
  }

  return out;
}
