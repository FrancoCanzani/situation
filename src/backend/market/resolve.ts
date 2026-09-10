import type { ArticleTicker } from "../../shared/types";
import { searchYahoo, type YahooSearchHit } from "./yahoo";

export type Mention = {
  name: string;
  ticker?: string;
};

const EQUITY = "EQUITY";
const CRYPTO = "CRYPTOCURRENCY";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function nameInTitle(title: string, name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  return new RegExp(`\\b${escapeRegExp(trimmed)}\\b`, "i").test(title);
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isThematicProduct(name: string) {
  return /\b(etf|etn|trust|fund|2x|3x|leveraged|inverse|ecosystem|bull|bear)\b/i.test(
    name,
  );
}

function namesAlign(mention: string, hitName: string) {
  const m = normalizeName(mention);
  const h = normalizeName(hitName);
  if (!m || !h) return false;
  if (m === h) return true;
  if (!h.startsWith(m) && !m.startsWith(h)) return false;

  const longer = h.length >= m.length ? h : m;
  const shorter = h.length >= m.length ? m : h;
  const rest = longer.slice(shorter.length).trim();
  if (!rest) return true;
  if (isThematicProduct(rest)) return false;
  return /^(inc|corp|co|ltd|limited|company|plc|sa|ag|nv|group|holdings)\b/.test(
    rest,
  );
}

function pickHit(
  hits: YahooSearchHit[],
  mentionName: string,
  preferredSymbol?: string,
): YahooSearchHit | null {
  const preferred = preferredSymbol?.trim().toUpperCase();

  if (preferred) {
    const exact = hits.find((hit) => hit.symbol === preferred);
    if (
      exact &&
      (exact.type === EQUITY || exact.type === CRYPTO) &&
      !isThematicProduct(exact.name)
    ) {
      return exact;
    }
  }

  const equities = hits.filter(
    (hit) =>
      hit.type === EQUITY &&
      !isThematicProduct(hit.name) &&
      namesAlign(mentionName, hit.name),
  );
  if (equities[0]) return equities[0];

  const cryptos = hits.filter(
    (hit) =>
      hit.type === CRYPTO &&
      !isThematicProduct(hit.name) &&
      namesAlign(mentionName, hit.name),
  );
  return cryptos[0] ?? null;
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
      const hit = pickHit(hits, name, mention.ticker);
      if (!hit || seen.has(hit.symbol)) continue;
      seen.add(hit.symbol);
      out.push({ symbol: hit.symbol, name });
    } catch {
      // skip unresolved mention
    }
  }

  return out;
}
