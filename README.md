# Situation

World-important news wire: ingest -> clean (Workers AI) -> D1 -> feed.

## Stack

Vite + React + Tailwind/shadcn · Hono Worker · D1 + Drizzle · AI SDK (`Output.object`) · TanStack Query

Requires **Bun >= 1.4** (1.3 hangs on Cloudflare Vite remote/WebSocket).

## Setup

```bash
bun install
bun run db:generate
bun run db:migrate:dev
bun dev
```

`bun dev` runs Vite and an inline scheduler that hits `/cdn-cgi/local/scheduled` every minute.

## Scripts

| Command | What |
|---|---|
| `bun dev` | Vite + local scheduler |
| `bun run scheduler` | Scheduler only |
| `bun run check-types` | Typecheck |
| `bun run db:generate` | Drizzle migrations from schema |
| `bun run db:migrate:dev` | Apply migrations locally |
| `bun run deploy` | Build + wrangler deploy |

Replace `database_id` in `wrangler.jsonc` before remote deploy.
