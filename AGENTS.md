# Agent notes

## Comments

Never add JSDoc. Never narrate what the next lines do. Names and types are the docs.

Only short `//` comments that explain a non-obvious **why** (platform limit, security, workaround). Prefer renaming over documenting.

## Files

- All `.ts` / `.tsx` filenames are **kebab-case**. Exports stay PascalCase / camelCase (`feed-page.tsx` → `FeedPage`, `use-intersection-observer.ts` → `useIntersectionObserver`).
- No PascalCase or camelCase filenames. `components/ui/` (shadcn) stays kebab.
- Features: `src/frontend/features/<domain>/components/` for UI; helpers in `features/<domain>/lib/`; feature hooks as `lib/use-*.ts`.
- Shared only when cross-feature: `components/` (+ `ui/`), `hooks/`, `lib/`.
- Routes stay thin: `routes/` wires `component: …`; page UI lives in features as `*-page.tsx`.
- Backend modules stay kebab / lowercase. When a resource grows: `routes/<resource>/{index,get,post}.ts` + `lib/` — don't force-split tiny files.
- Shared wire types live in `src/shared/`.
- No barrels (`index.ts` re-exports) unless needed for a package boundary.
- Leave generated / entry specials as-is when required by tooling: `main.tsx`, `routes/__root.tsx`, `routeTree.gen.ts`, `index.css`. Prefer `app.tsx` over `App.tsx`.

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
- Categories: politics, business, tech, sports
- Soft-hide junk with `keep = false` (opinion, recipes, listicles, lifestyle)

## UI

- Flat, minimal, monochrome-first. No card chrome, no all-caps labels.
- Font weights: 400 default, 700 for emphasis only (no medium/semibold). After `shadcn add`, replace any `font-medium` / `font-semibold` in new UI with `font-normal` or `font-bold`.
- Tailwind utilities in components; `index.css` for tokens/base only.
- **Use shadcn** (`components/ui/`, `bunx shadcn@latest add <name> --yes`). Do not hand-roll dialogs, menus, popovers, sheets, or other primitives that shadcn already covers.
- `components.json`: `style` `base-nova`, `iconLibrary` **`lucide`** (not `radix` — radix breaks IconPlaceholder transforms and leaves broken imports).
- UI components import `cn` from `"cn"`. App code may use `@/lib/utils` (re-exports `cn`).
- `shadcn add` may overwrite `button.tsx` as a dependency — restore project button styles afterward; keep `icon-sm` if dialog/sheet need it.
