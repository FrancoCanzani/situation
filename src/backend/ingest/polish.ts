import { APICallError, generateText, Output } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { z } from "zod";

import { CATEGORIES, SENTIMENTS } from "../../shared/types";

const KEEP_IMPORTANCE = 7;
const KEEP_SPORTS_IMPORTANCE = 8;

const polishSchema = z.object({
  importance: z
    .number()
    .min(0)
    .max(10)
    .transform((n) => Math.round(Math.min(10, Math.max(0, n)))),
  category: z.enum(CATEGORIES),
  sentiment: z.enum(SENTIMENTS),
  summary: z.string(),
  discardReason: z.string().optional(),
});

const POLISH_MODEL = "@cf/zai-org/glm-4.7-flash";
const POLISH_MAX_TOKENS = 400;
const POLISH_TIMEOUT_MS = 8_000;

export type PolishResult = {
  importance: number;
  category: (typeof CATEGORIES)[number];
  sentiment: (typeof SENTIMENTS)[number];
  summary: string;
  discardReason?: string;
};

export function keepFromPolish(polished: PolishResult | null): boolean {
  if (!polished) return false;
  const floor =
    polished.category === "sports" ? KEEP_SPORTS_IMPORTANCE : KEEP_IMPORTANCE;
  return polished.importance >= floor;
}

export function polishModel(ai: Ai) {
  return createWorkersAI({ binding: ai })(POLISH_MODEL, {
    reasoning_effort: null,
    chat_template_kwargs: { enable_thinking: false },
  });
}

export async function polishArticle(
  ai: Ai,
  input: { title: string; rawSummary: string; source: string },
): Promise<PolishResult> {
  const { output, finishReason } = await generateText({
    model: polishModel(ai),
    maxRetries: 0,
    maxOutputTokens: POLISH_MAX_TOKENS,
    abortSignal: AbortSignal.timeout(POLISH_TIMEOUT_MS),
    output: Output.object({
      name: "ArticlePolish",
      description: "Gate a headline for Situation, a national news wire.",
      schema: polishSchema,
    }),
    prompt: [
      "You gate headlines for Situation: a US / UK / Europe national news wire.",
      "Return structured JSON only. Do not rewrite the Title.",
      "Judge the Title first. It must state a concrete new fact (who/what/where/when).",
      "Topic gravity alone is not enough. When unsure, score low.",
      "",
      "importance: integer 0–10.",
      "Feed keeps politics/business/tech at ≥ 7, sports at ≥ 8.",
      "10 = war, mass disaster, systemic market shock, decisive national election/high-court outcome.",
      "8–9 = clear national or international consequence stated in the Title.",
      "7 = solid national-desk news (non-sports).",
      "4–6 = narrow, local, sector-only, or soft.",
      "0–3 = not a news lead: opinion, lifestyle, listicle, evergreen, promo, fan content.",
      "",
      "Always score below 7:",
      "- city/state-only politics or crime without national stake",
      "- weather, traffic, schools, municipal budgets",
      "- routine earnings noise, minor launches, small funding rounds",
      "- gadget reviews, shopping, how-tos",
      "- anniversaries, look-backs, quote features, explainers, 'what it means'",
      "- ads, affiliate, live blogs, celebrity/entertainment, opinion columns",
      "- recipes, listicles, horoscopes, betting, fantasy",
      "",
      "SPORTS — default 0–2. Almost nothing in sports should clear the feed.",
      "Keep sports only at 8–10 for rare stakes stated in the Title:",
      "- world championship / major tournament FINAL outcome",
      "- doping, match-fixing, or top-federation governance scandal",
      "- franchise relocation or mega ownership sale with civic/market weight",
      "- death of a global household-name athlete",
      "- injury ONLY if it is clearly league-altering for a top global competition",
      "  (e.g. Ballon d'Or contender out of a World Cup final) — otherwise injuries = 0–2",
      "Score 0–2 for all of the following (never ≥ 7):",
      "- match results, scores, fixtures, previews, season openers, week chatter",
      "- polls, rankings, league tables, 'rises to No. 1'",
      "- ruled out / questionable / injury reports / lineups / inactives",
      "- transfers, loans, contracts, managerial hire/fire, club exec moves",
      "- player/athlete salary deals, contract extensions, 'signs for $Xm per year'",
      "- college sports, draft, fantasy, betting, training-camp notes",
      "A sports story that only matters to fans of one club or league = 0–2.",
      "If sports and unsure → 0–2.",
      "",
      "category: politics | business | tech | sports (one primary desk).",
      "politics = government, elections, war, diplomacy, courts, geopolitics.",
      "business = markets, listed firms, earnings, M&A, economy, corp strategy,",
      "  product/recall/production from public companies, money-moving regulation.",
      "tech = platforms, AI research, chips, cyber, infra, open-source,",
      "  pure tech-regulatory fights — not every story involving a tech firm.",
      "sports = anything whose subject is athletes, clubs, leagues, matches, or sports labor.",
      "  Player/athlete contracts, salaries, extensions, transfers, loans = sports (usually 0–2),",
      "  NEVER business — a dollar figure does not make it business.",
      "  Club/franchise ownership sale or listed sportswear/earnings → may be business.",
      "Tie-break: public company / stock stake → business (even product news).",
      "Athlete or club sporting deal with a dollar amount → sports, not business.",
      "Tesla/Apple/Amazon product or factory → business. Model drop like ChatGPT → tech.",
      "Disaster / public health with political stake → politics.",
      "Never invent another category.",
      "",
      "summary: 1–2 neutral factual sentences. No hot takes.",
      "sentiment: tone of the event (positive/negative/neutral/mixed), not writing style.",
      "discardReason: short label if the item should not run on the wire.",
      "",
      `Source: ${input.source}`,
      `Title: ${input.title}`,
      `Snippet: ${input.rawSummary.slice(0, 1200) || "(none)"}`,
    ].join("\n"),
  });

  if (!output) throw new Error(`empty output (${finishReason})`);

  return {
    importance: output.importance,
    category: output.category,
    sentiment: output.sentiment,
    summary:
      output.summary.trim() || input.rawSummary.slice(0, 400) || input.title,
    discardReason: output.discardReason,
  };
}

export function formatAiError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const ref = /internal error;\s*reference\s*=\s*(\S+)/i.exec(error.message)?.[1];
  if (ref) return `workers-ai internal ref=${ref}`;

  if (error.name === "TimeoutError" || error.name === "AbortError") {
    return "timed out";
  }

  if (APICallError.isInstance(error) && error.statusCode != null) {
    return `HTTP ${error.statusCode} ${error.message}`;
  }

  if (error.cause !== undefined) {
    return `${error.message} (${formatAiError(error.cause)})`;
  }
  return error.message;
}
