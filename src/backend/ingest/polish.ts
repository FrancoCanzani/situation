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
});

const POLISH_MODEL = "@cf/zai-org/glm-4.7-flash";
const POLISH_TIMEOUT_MS = 25_000;
const POLISH_MAX_TOKENS = 200;

export type PolishResult = z.infer<typeof polishSchema>;

export function polishModel(ai: Ai) {
  return createWorkersAI({ binding: ai })(POLISH_MODEL, {
    reasoning_effort: null,
    chat_template_kwargs: { enable_thinking: false },
  });
}

export async function pingPolishModel(ai: Ai): Promise<{ text: string; ms: number }> {
  const started = performance.now();
  const { text } = await generateText({
    model: polishModel(ai),
    prompt: "Reply with the single word pong.",
    maxRetries: 0,
    maxOutputTokens: 8,
    abortSignal: AbortSignal.timeout(POLISH_TIMEOUT_MS),
  });
  return { text: text.trim(), ms: Math.round(performance.now() - started) };
}

export async function polishArticle(
  ai: Ai,
  input: { title: string; rawSummary: string; source: string },
): Promise<PolishResult | null> {
  const started = performance.now();
  console.log("[polish] start binding", POLISH_MODEL, input.source, input.title);

  try {
    const { output, usage, finishReason } = await generateText({
      model: polishModel(ai),
      abortSignal: AbortSignal.timeout(POLISH_TIMEOUT_MS),
      maxRetries: 0,
      maxOutputTokens: POLISH_MAX_TOKENS,
      output: Output.object({
        name: "ArticlePolish",
        description: "Classify and clean a news headline for a world news wire.",
        schema: polishSchema,
      }),
      prompt: [
        "You clean news for Situation, a world-important news wire.",
        "Return structured JSON only.",
        "",
        "keep=false for: opinion/op-eds, recipes, lifestyle, listicles, product roundups,",
        "celebrity gossip, fantasy sports tips, betting SEO, pure analysis without a news event.",
        "keep=true for factual reported news (who/what/where/when).",
        "",
        "summary: 1-2 neutral factual sentences. No hot takes.",
        "category: one of world, politics, business, tech, science, health, climate, sports, other.",
        "sentiment: tone of the event (positive/negative/neutral/mixed), not writing style.",
        "",
        `Source: ${input.source}`,
        `Title: ${input.title}`,
        `Snippet: ${input.rawSummary.slice(0, 1200) || "(none)"}`,
      ].join("\n"),
    });
    const elapsed = `${Math.round(performance.now() - started)}ms`;

    if (!output) {
      console.error("[polish] empty", elapsed, input.source, input.title, {
        finishReason,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });
      return null;
    }

    console.log("[polish] ok", elapsed, input.source, input.title, {
      keep: output.keep,
      category: output.category,
      sentiment: output.sentiment,
      finishReason,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });

    return {
      ...output,
      summary: output.summary.trim() || input.rawSummary.slice(0, 400) || input.title,
    };
  } catch (error) {
    console.error(
      "[polish] failed",
      `${Math.round(performance.now() - started)}ms`,
      input.source,
      input.title,
      inspectAiError(error),
    );
    return null;
  }
}

function inspectAiError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { value: String(error) };
  const inspected: Record<string, unknown> = {
    name: error.name,
    message: error.message,
  };
  if (error.cause !== undefined) inspected.cause = inspectAiError(error.cause);
  if (APICallError.isInstance(error)) {
    inspected.statusCode = error.statusCode;
    inspected.url = error.url;
    inspected.responseBody = error.responseBody?.slice(0, 1500);
    inspected.data = error.data;
  }
  return inspected;
}
