import { APICallError, generateText, Output } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { z } from "zod";

import { CATEGORIES, SENTIMENTS } from "../../shared/types";
import type { Mention } from "../market/resolve";

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
  mentions: z
    .array(
      z.object({
        name: z.string(),
        ticker: z.string().optional(),
      }),
    )
    .max(3)
    .optional(),
});

const POLISH_MODEL = "@cf/zai-org/glm-4.7-flash";
const POLISH_MAX_TOKENS = 400;
const POLISH_TIMEOUT_MS = 8_000;

export type PolishResult = {
  importance: number;
  category: (typeof CATEGORIES)[number];
  sentiment: (typeof SENTIMENTS)[number];
  summary: string;
  mentions: Mention[];
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
        "Score a headline for a world news wire: require an informative news-event title, then extract listed companies.",
      schema: polishSchema,
    }),
    prompt: [
      "You gate news for Situation, a world-important news wire.",
      "Return structured JSON only. Do not rewrite the headline.",
      "",
      "Judge the Title first. The Title must itself report a new fact or event",
      "(who/what/where/when). Topic gravity alone is not enough: a soft headline",
      "about a major subject (war, 9/11, elections, markets) still scores low.",
      "",
      "importance: integer 0–10 for how world-important this reported news event is.",
      "10 = major geopolitics, war, disaster, market-moving, elections, courts with public stake.",
      "7–9 = clear news event worth the wire; Title states what newly happened or was newly reported.",
      "4–6 = narrow or soft news.",
      "0–3 = non-informative Title, opinion, lifestyle, listicle, sports score, celebrity, evergreen, ad, live blog.",
      "Feed only shows importance ≥ 7. When unsure, score below 7.",
      "",
      "Score below 7 when the Title is not an informative news lead, including:",
      "- anniversaries, remembrances, 'X years after', 'still lingers', look-backs",
      "- quote-led soft features ('…': how/why…) with no new action in the Title",
      "- 'how X happened/responded', oral history, retrospectives with no new development",
      "- vague thesis Titles: 'devastating truth', 'what it means', 'the real story', 'lessons from'",
      "- explainers, evergreens, analysis, features that rehash a known event",
      "",
      "Also score low (0–3) for:",
      "- ads, affiliate, sponsored, credit cards, product roundups, 'best of' shopping",
      "- live blogs, live results, match trackers, rolling 'politics live' / 'Europe live' pages",
      "- sports matches, scores, fixtures; sports news events (ban, death, corruption) can score higher",
      "- celebrity, entertainment, interviews, awards, culture features",
      "- human-interest / viral video / true-crime-as-entertainment with no public-event stake",
      "- opinion, op-eds, columns, analysis, editorials, 'containing X', guest essays",
      "- recipes, lifestyle, listicles, horoscopes, betting, fantasy sports",
      "",
      "summary: 1-2 neutral factual sentences. No hot takes. Unused in the list UI.",
      "category: one of world, politics, business, tech, science, health, climate, sports, other.",
      "sentiment: tone of the event (positive/negative/neutral/mixed), not writing style.",
      "discardReason: short label if importance < 7 (e.g. anniversary, non-informative-title, opinion).",
      "mentions: up to 3 publicly traded companies named in the Title (exact spelling as in Title).",
      "Include ticker only if you are sure (e.g. AAPL). Empty array if none.",
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
    mentions: output.mentions ?? [],
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
