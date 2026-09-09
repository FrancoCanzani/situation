import { APICallError, generateText, Output } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { z } from "zod";

import { CATEGORIES, SENTIMENTS } from "../../shared/types";

const polishSchema = z.object({
  keep: z.boolean(),
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
const POLISH_MAX_TOKENS = 320;
const POLISH_TIMEOUT_MS = 8_000;

export type PolishResult = z.infer<typeof polishSchema>;

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
      description: "Gate a headline for a world news wire: keep or discard.",
      schema: polishSchema,
    }),
    prompt: [
      "You gate news for Situation, a world-important news wire.",
      "Return structured JSON only. Do not rewrite the headline.",
      "",
      "keep=true only for a reported news event: something happened (who/what/where/when).",
      "Government action, conflict, disaster, courts, diplomacy, markets, elections, accidents.",
      "",
      "keep=false for:",
      "- ads, affiliate, sponsored, credit cards, product roundups, 'best of' shopping",
      "- live blogs, live results, match trackers, rolling 'politics live' / 'Europe live' pages",
      "- sports matches, scores, fixtures; keep sports only if it is a news event (ban, death, corruption)",
      "- celebrity, entertainment, interviews, awards, culture features",
      "- human-interest / viral video / true-crime-as-entertainment with no public-event stake",
      "- explainers, evergreens, 'what it really means', anniversary features with no new fact",
      "- opinion, op-eds, columns, analysis, editorials, 'containing X', guest essays",
      "- recipes, lifestyle, listicles, horoscopes, betting, fantasy sports",
      "",
      "When unsure, keep=false.",
      "summary: 1-2 neutral factual sentences. No hot takes. Unused in the list UI.",
      "category: one of world, politics, business, tech, science, health, climate, sports, other.",
      "sentiment: tone of the event (positive/negative/neutral/mixed), not writing style.",
      "discardReason: short label if keep=false.",
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
    ...output,
    summary: output.summary.trim() || input.rawSummary.slice(0, 400) || input.title,
    mentions: output.mentions ?? [],
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
