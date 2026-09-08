import { Hono } from "hono";

import { createDb } from "./db";
import { formatAiError, pingPolishModel } from "./ingest/polish";
import { runIngest } from "./ingest/run";
import { newsRoutes } from "./routes/news";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.route("/api/news", newsRoutes);

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/ai-ping", async (c) => {
  try {
    const result = await pingPolishModel(c.env.AI);
    return c.json({ ok: true, ...result });
  } catch (error) {
    const message = formatAiError(error);
    console.error("[ai-ping] failed", message);
    return c.json({ ok: false, error: message }, 500);
  }
});

app.post("/api/ingest", async (c) => {
  const result = await runCronIngest(c.env);
  if ("alreadyRunning" in result) return c.json(result, 409);
  return c.json(result);
});

let ingestRunning = false;

async function runCronIngest(env: CloudflareBindings) {
  if (ingestRunning) {
    console.log("[cron] skip, already running");
    return { alreadyRunning: true as const };
  }
  ingestRunning = true;
  try {
    return await runIngest(env, createDb(env.DB));
  } catch (error) {
    console.error("[cron] failed", formatAiError(error));
    throw error;
  } finally {
    ingestRunning = false;
  }
}

export default {
  fetch: app.fetch,

  async scheduled(_controller: ScheduledController, env: CloudflareBindings) {
    await runCronIngest(env);
  },
};
