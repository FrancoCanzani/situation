import { generateText, Output } from "ai";
import { and, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";

import type { Db } from "../db";
import { articles, events } from "../db/schema";
import { formatAiError, polishModel } from "./polish";

const EMBED_MODEL = "@cf/baai/bge-base-en-v1.5";
const CLUSTER_WINDOW_MS = 48 * 60 * 60 * 1000;
const QUERY_TOP_K = 8;
const AUTO_MERGE_SCORE = 0.86;
const CANDIDATE_SCORE = 0.72;
const EXTRACT_MAX_TOKENS = 200;
const EXTRACT_TIMEOUT_MS = 6_000;
const MATCH_TIMEOUT_MS = 6_000;

const extractSchema = z.object({
  title: z.string(),
  summary: z.string(),
});

const matchSchema = z.object({
  sameEvent: z.boolean(),
});

export type ClusterInput = {
  articleId: string;
  title: string;
  summary: string;
  importance: number | null;
  publishedAt: Date;
};

function confidenceFromSources(sourceCount: number): number {
  return Math.min(100, Math.round((sourceCount / 3) * 100));
}

async function embedText(ai: Ai, text: string): Promise<number[]> {
  const trimmed = text.trim().slice(0, 2000);
  if (!trimmed) throw new Error("empty embed text");

  const result = await ai.run(EMBED_MODEL, { text: [trimmed] });
  if (!("data" in result) || !result.data?.[0]?.length) {
    throw new Error("empty embedding");
  }
  return result.data[0];
}

async function extractEvent(
  ai: Ai,
  input: { title: string; summary: string },
): Promise<{ title: string; summary: string }> {
  const { output, finishReason } = await generateText({
    model: polishModel(ai),
    maxRetries: 0,
    maxOutputTokens: EXTRACT_MAX_TOKENS,
    abortSignal: AbortSignal.timeout(EXTRACT_TIMEOUT_MS),
    output: Output.object({
      name: "EventExtract",
      description: "Canonical real-world event for a news article.",
      schema: extractSchema,
    }),
    prompt: [
      "Extract the underlying news event from this article.",
      "title: short factual wire headline of what happened (not outlet voice).",
      "summary: 1-2 neutral sentences.",
      "Do not invent facts. Prefer concrete who/what/where.",
      "",
      `Title: ${input.title}`,
      `Summary: ${input.summary.slice(0, 800) || "(none)"}`,
    ].join("\n"),
  });

  if (!output) throw new Error(`empty event extract (${finishReason})`);
  return {
    title: output.title.trim() || input.title,
    summary:
      output.summary.trim() || input.summary.slice(0, 400) || input.title,
  };
}

async function sameEvent(
  ai: Ai,
  candidate: { title: string; summary: string },
  existing: { title: string; summary: string },
): Promise<boolean> {
  const { output, finishReason } = await generateText({
    model: polishModel(ai),
    maxRetries: 0,
    maxOutputTokens: 64,
    abortSignal: AbortSignal.timeout(MATCH_TIMEOUT_MS),
    output: Output.object({
      name: "EventMatch",
      description: "Whether two reports describe the same real-world event.",
      schema: matchSchema,
    }),
    prompt: [
      "Do these two reports describe the same real-world event?",
      "sameEvent=true only if they are the same occurrence, not merely the same topic.",
      "When unsure, sameEvent=false.",
      "",
      `A title: ${candidate.title}`,
      `A summary: ${candidate.summary.slice(0, 400)}`,
      "",
      `B title: ${existing.title}`,
      `B summary: ${existing.summary.slice(0, 400)}`,
    ].join("\n"),
  });

  if (!output) throw new Error(`empty event match (${finishReason})`);
  return output.sameEvent;
}

async function resolveMatch(
  ai: Ai,
  vectorize: VectorizeIndex,
  candidate: { title: string; summary: string },
  vector: number[],
  db: Db,
  now: Date,
): Promise<string | null> {
  const matches = await vectorize.query(vector, {
    topK: QUERY_TOP_K,
    returnMetadata: "none",
  });

  const scored = (matches.matches ?? [])
    .filter(
      (match) =>
        typeof match.score === "number" && match.score >= CANDIDATE_SCORE,
    )
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  if (scored.length === 0) return null;

  const ids = scored.map((match) => match.id);
  const cutoff = new Date(now.getTime() - CLUSTER_WINDOW_MS);
  const rows = await db
    .select()
    .from(events)
    .where(and(inArray(events.id, ids), gte(events.lastSeenAt, cutoff)));

  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered = scored
    .map((match) => ({ match, row: byId.get(match.id) }))
    .filter(
      (
        entry,
      ): entry is {
        match: (typeof scored)[number];
        row: NonNullable<typeof entry.row>;
      } => Boolean(entry.row),
    );

  for (const { match, row } of ordered) {
    if ((match.score ?? 0) >= AUTO_MERGE_SCORE) return row.id;
    try {
      if (
        await sameEvent(ai, candidate, {
          title: row.title,
          summary: row.summary,
        })
      ) {
        return row.id;
      }
    } catch (error) {
      console.error("[ingest] event-match", formatAiError(error));
    }
  }

  return null;
}

export async function assignArticleEvent(
  env: CloudflareBindings,
  db: Db,
  input: ClusterInput,
): Promise<{ eventId: string; created: boolean }> {
  const ai = env.AI;
  if (!ai) throw new Error("AI binding missing");

  const extracted = await extractEvent(ai, {
    title: input.title,
    summary: input.summary,
  });

  const now =
    input.publishedAt.getTime() > Date.now() ? new Date() : input.publishedAt;
  const vector = await embedText(
    ai,
    `${extracted.title}\n${extracted.summary}`,
  );

  let eventId: string | null = null;
  if (env.VECTORIZE) {
    try {
      eventId = await resolveMatch(
        ai,
        env.VECTORIZE,
        extracted,
        vector,
        db,
        now,
      );
    } catch (error) {
      console.error("[ingest] vector-query", formatAiError(error));
    }
  }

  if (eventId) {
    const [existing] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!existing) {
      eventId = null;
    } else {
      const sourceCount = existing.sourceCount + 1;
      const importance = Math.max(
        existing.importance ?? 0,
        input.importance ?? 0,
      );
      await db
        .update(events)
        .set({
          lastSeenAt: now,
          sourceCount,
          confidence: confidenceFromSources(sourceCount),
          importance,
        })
        .where(eq(events.id, eventId));
    }
  }

  let created = false;
  if (!eventId) {
    eventId = crypto.randomUUID();
    created = true;
    await db.insert(events).values({
      id: eventId,
      title: extracted.title,
      summary: extracted.summary,
      importance: input.importance,
      confidence: confidenceFromSources(1),
      sourceCount: 1,
      firstSeenAt: now,
      lastSeenAt: now,
    });
  }

  await db
    .update(articles)
    .set({ eventId })
    .where(eq(articles.id, input.articleId));

  if (env.VECTORIZE) {
    try {
      await env.VECTORIZE.upsert([
        {
          id: eventId,
          values: vector,
          metadata: { lastSeenAt: now.getTime() },
        },
      ]);
    } catch (error) {
      console.error("[ingest] vector-upsert", formatAiError(error));
    }
  }

  return { eventId, created };
}
