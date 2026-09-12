import { APICallError, generateText, Output } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { z } from "zod";

import { CATEGORIES, SENTIMENTS } from "../../shared/types";

const KEEP_IMPORTANCE = 7;

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
  return polished.importance >= KEEP_IMPORTANCE;
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
      description:
        "Score a headline for a national/international news wire.",
      schema: polishSchema,
    }),
    prompt: [
      "You gate news for Situation, a US/UK/Europe national news wire.",
      "Return structured JSON only. Do not rewrite the headline.",
      "",
      "Judge the Title first. The Title must itself report a new fact or event",
      "(who/what/where/when). Topic gravity alone is not enough.",
      "",
      "importance: integer 0–10. Feed only shows importance ≥ 7. When unsure, score below 7.",
      "≥ 7 = would run high on a national desk in the US, UK, or a major EU capital,",
      "or is clearly market-moving / geopolitically consequential. Notable, not merely topical.",
      "10 = major geopolitics, war, disaster, market-moving shock, national elections, high courts.",
      "7–9 = clear national/international news event; Title states what newly happened.",
      "4–6 = narrow, soft, or sub-national news.",
      "0–3 = non-informative Title, opinion, lifestyle, listicle, celebrity, evergreen, ad.",
      "",
      "Score below 7 for local or desk-fill, including:",
      "- city/county/state-only politics or crime without national stake",
      "- regional weather, traffic, schools, municipal budgets",
      "- routine earnings noise, minor product launches, small funding rounds",
      "- sports scores, fixtures, injury notes (bans/corruption/ownership can score higher)",
      "- tech gadget reviews, shopping, how-tos",
      "",
      "Also score below 7 when the Title is not an informative news lead:",
      "- anniversaries, remembrances, look-backs, 'X years after'",
      "- quote-led soft features with no new action in the Title",
      "- explainers, evergreens, analysis, 'what it means', oral history",
      "",
      "Also score low (0–3) for:",
      "- ads, affiliate, sponsored, product roundups",
      "- live blogs, live results, match trackers, rolling live pages",
      "- celebrity, entertainment, awards, culture features",
      "- opinion, op-eds, columns, editorials, guest essays",
      "- recipes, lifestyle, listicles, horoscopes, betting, fantasy sports",
      "",
      "summary: 1-2 neutral factual sentences. No hot takes.",
      "category: one of politics, business, tech, sports. Pick one primary desk.",
      "politics = government, elections, war, diplomacy, courts with public stake, geopolitics.",
      "business = markets, listed companies, earnings, M&A, economy, corp strategy,",
      "product unveilings / recalls / production from public companies, regulation that moves money.",
      "tech = platforms, AI research, chips/semiconductors, cyber, infra, open-source,",
      "or pure tech-regulatory fights — not every story that involves a tech firm.",
      "sports = notable sports news only (not scores).",
      "When both fit: public company / stock / market stake → business (even product launches).",
      "Tesla/Apple/Amazon product or factory news → business. ChatGPT model drop → tech.",
      "Disasters / public health with political stake → politics.",
      "Always pick the closest of those four. Never invent another bucket.",
      "sentiment: tone of the event (positive/negative/neutral/mixed), not writing style.",
      "discardReason: short label if importance < 7.",
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
    summary: output.summary.trim() || input.rawSummary.slice(0, 400) || input.title,
    discardReason: output.discardReason,
  };
}

export function formatAiError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const ref = /internal error;\s*reference\s*=\s*(\S+)/i.exec(error.message)?.[1];
  if (ref) return `workers-ai internal ref=${ref}`;

  if (error.name === "TimeoutError" || error.name === "AbortError") return "timed out";

  if (APICallError.isInstance(error) && error.statusCode != null) {
    return `HTTP ${error.statusCode} ${error.message}`;
  }

  if (error.cause !== undefined) return `${error.message} (${formatAiError(error.cause)})`;
  return error.message;
}
