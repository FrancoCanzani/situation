# Agent notes

## Comments

Never add JSDoc. Never narrate what the next lines do. Names and types are the docs.

Only short `//` comments that explain a non-obvious **why** (platform limit, security, workaround). Prefer renaming over documenting.

## Git

- Never `git commit` unless the user asks in that turn.
- Never create a branch unless the user asks in that turn.

## Verification

- User verifies by running the app. Do not drive a browser or seed data to prove UI.
- `bun run check-types` is the check. Stop there.
- Never insert fake data to see something render.

## Dev server

- Never kill/restart a running `bun run dev` unless asked. Reuse the existing one.

## Database

- Never run `db:generate`, `db:migrate`, `wrangler d1 …`, or drizzle apply unless asked.
- Never edit `drizzle/` migrations or `meta/*`. Only edit `src/backend/db/schema.ts`. Migrations are the user's job.

## Fetch

Call `fetch` where the result is used. Do not wrap one-off requests in named API helper modules. Shared types and query options are fine.

## Product

- Name: **Situation**
- World-important news wire: ingest → clean (Workers AI) → D1 → feed
- Categories: world, politics, business, tech, science, health, climate, sports, other
- Soft-hide junk with `keep = false` (opinion, recipes, listicles, lifestyle)

## UI

- Flat, minimal, monochrome-first. No card chrome, no all-caps labels.
- Font weights: 400 default, 700 for emphasis only (no medium/semibold).
- Tailwind utilities in components; `index.css` for tokens/base only.
