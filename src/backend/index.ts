import { Hono } from "hono";

import { createDb, type Db } from "./db";
import { pingPolishModel } from "./ingest/polish";
import { runIngest } from "./ingest/run";
import { newsRoutes } from "./routes/news";

type AppEnv = {
  Bindings: Env;
  Variables: {
    db: Db;
  };
};

const app = new Hono<AppEnv>();

app.use("/api/*", async (c, next) => {
  c.set("db", createDb(c.env.DB));
  await next();
});

app.route("/api/news", newsRoutes);

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/ai-ping", async (c) => {
  console.log("[ai-ping] start");
  try {
    const result = await pingPolishModel(c.env.AI);
    console.log("[ai-ping] ok", result);
    return c.json({ ok: true, ...result });
  } catch (error) {
    console.error("[ai-ping] failed", inspectPingError(error));
    return c.json({ ok: false, error: inspectPingError(error) }, 500);
  }
});

app.post("/api/ingest", async (c) => {
  const result = await runCronIngest(c.env);
  if ("alreadyRunning" in result) return c.json(result, 409);
  return c.json(result);
});

function elapsed(start: number): string {
  return `${Math.round(performance.now() - start)}ms`;
}

function inspectPingError(error: unknown): string {
  if (error instanceof Error) return `${error.name} | ${error.message}`;
  return String(error);
}

let ingestRunning = false;

async function runCronIngest(env: Env) {
  if (ingestRunning) {
    console.log("[cron] skip, already running");
    return { alreadyRunning: true as const };
  }
  ingestRunning = true;
  const started = performance.now();
  console.log("[cron] start");
  try {
    const result = await runIngest(env, createDb(env.DB));
    console.log("[cron] done", elapsed(started), result);
    return result;
  } catch (error) {
    console.error("[cron] failed", elapsed(started), error);
    throw error;
  } finally {
    ingestRunning = false;
  }
}

export default {
  fetch: app.fetch,

  async scheduled(_controller: ScheduledController, env: Env) {
    await runCronIngest(env);
  },
};
