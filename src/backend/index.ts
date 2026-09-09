import { Hono } from "hono";

import { createDb } from "./db";
import { runIngest } from "./ingest/run";
import { marketRoutes } from "./routes/market";
import { newsRoutes } from "./routes/news";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.route("/api/news", newsRoutes);
app.route("/api/market", marketRoutes);

app.post("/api/ingest", async (c) => {
  return c.json(await runIngest(c.env, createDb(c.env.DB)));
});

export default {
  fetch: app.fetch,
  scheduled: (_controller: ScheduledController, env: CloudflareBindings) =>
    runIngest(env, createDb(env.DB)),
};
