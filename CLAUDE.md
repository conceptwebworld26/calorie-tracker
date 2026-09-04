# CLAUDE.md

Persistent development context for Claude Code working in this repository.
Read this before making changes. It is the source of truth for *how* work is
done here; `docs/` holds the reasoning behind *what* already exists.

> This project also has an `AGENTS.md`, auto-generated and rewritten by
> `next dev`. It carries framework-level rules for this Next.js version and is
> unrelated to the project rules below. Do not hand-edit it.

---

## Project purpose

A single-page calorie tracker with three ways to add food: pick from a static
list of 24 common foods, describe a meal in plain English, or upload a photo.
The last two use the Gemini API to estimate nutrition. A running
calorie/protein/carb/fat total sits at the top of the page.

It is deliberately a **single-user, local-first tool**. There is no login, no
accounts, and no multi-tenancy. Everything lives in a local SQLite file and
persists across page refreshes.

## Technology stack

| Concern    | Choice |
|------------|--------|
| Framework  | Next.js 16.3.1, App Router, Turbopack |
| Language   | TypeScript 5 (`strict: true`) |
| UI         | React 19.2.8 |
| Styling    | Tailwind CSS v4 (via `@tailwindcss/postcss`) |
| Database   | better-sqlite3 13 — local file, no external service |
| AI         | `@google/genai` 2.21 (Gemini) |
| Linting    | ESLint 9 + `eslint-config-next` |

There is **no test framework installed**. See *Testing expectations* below.

## Architecture overview

A server-rendered shell, one client component page, and four API route
handlers.

```
Browser (app/page.tsx, "use client" — owns all log state)
   |  fetch
   v
Route handlers (app/api/**)
   |-- /api/log            GET today's entries · POST one entry
   |-- /api/log/[id]       DELETE one entry
   |-- /api/analyze/text   POST description  --+
   |-- /api/analyze/image  POST photo        --+--> lib/gemini.ts --> Gemini API
   |
   v
lib/db.ts --> data/app.db (SQLite, WAL mode)
```

Key invariants:

- **`app/page.tsx` is the only stateful owner of the log.** Child components
  receive callbacks (`onAdd`, `onAddMany`, `onRemove`); they never fetch log
  data themselves.
- **The `/api/analyze/*` routes never write to the database.** They are pure
  estimate endpoints. Persistence happens only when the user confirms and
  `POST /api/log` is called.
- **All three add-food paths converge on `POST /api/log`**, so everything
  persists identically.
- **Log entries are denormalized.** A row stores a copy of the nutrition values
  at log time, so editing `lib/foods.ts` later cannot rewrite history.

See `docs/architecture.md` for the full picture.

## Important directories

```
app/          Pages, layout, and API route handlers
app/api/      All server endpoints (log CRUD + AI analysis)
components/   Presentational React components, no data fetching
lib/          Types, static food data, DB connection, Gemini client, hooks
docs/         Product/architecture/roadmap docs + dated decision logs
data/         SQLite file, created at runtime (gitignored)
```

Path alias: `@/*` maps to the repository root (`@/lib/types`, `@/components/...`).

## Development commands

```bash
npm install        # install dependencies
npm run dev        # dev server on http://localhost:3000
npm run build      # production build (also runs a full TypeScript pass)
npm start          # serve the production build
npm run lint       # ESLint
npx tsc --noEmit   # type-check only, without building
```

The SQLite file is created automatically at `data/app.db` on first run.

## Testing commands

There are none yet — no test framework, no test files, no `test` script.
**Verification is currently manual**, plus:

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Treat those three as the mandatory pre-commit gate until a real test suite
exists. Do not claim a change is verified on the strength of a build alone
when the change has runtime behaviour worth exercising — run it in the browser.

## Environment and configuration

Configuration lives in `.env` (gitignored). `.env.example` documents the shape.

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | For AI routes only | Gemini auth. Without it, `/api/analyze/*` return 500 with a setup message; the rest of the app works. |
| `GEMINI_MODEL` | No | Overrides the model. Defaults to `gemini-3.5-flash-lite`. |

`NODE_ENV` is read to decide whether to cache the DB and Gemini clients on
`globalThis` (a dev-only guard against hot reload creating new handles).

## Coding conventions

- **TypeScript strict throughout.** Do not add `any`, `@ts-ignore`, or
  non-null assertions to get past the type checker; fix the type.
- **The server/client boundary is explicit.** Anything using state, effects, or
  browser APIs starts with `"use client"`. Keep components server-side by
  default when they do not need interactivity.
- **Components are presentational.** They take props and call callbacks. Data
  fetching lives in `app/page.tsx` or in a `lib/` hook (`useAnalysis`).
- **Tailwind utility classes inline.** No CSS modules, no styled-components.
  Every colour has a `dark:` counterpart — the app supports dark mode and new
  UI must too.
- **Naming:** `camelCase` in TypeScript, `snake_case` for SQLite columns. The
  SQL `SELECT` aliases columns back to camelCase (`serving_size as servingSize`)
  so the rest of the codebase never sees snake_case.
- **Comments explain *why*, not *what*.** The existing code comments
  non-obvious decisions (why POSTs are sequential, why object URLs are revoked
  where they are). Match that density — do not narrate obvious code.
- **Accessibility is not optional.** Tabs use `role="tab"`/`aria-selected`,
  inputs have labels, images have alt text. Keep it that way.

## Architectural principles

1. **Local-first and dependency-light.** No external database, no auth
   provider, no state-management library. Adding one needs a strong reason.
2. **Nothing is written without an explicit user action.** AI estimates are
   always shown for confirmation before they reach the log.
3. **Never trust model output.** Totals are computed server-side from the line
   items, and every item is validated as fully numeric before it leaves
   `lib/gemini.ts`. Do not surface a model-supplied total.
4. **Denormalize history.** Logged rows are snapshots, not references.
5. **One page.** Resist adding routes and navigation unless a feature genuinely
   cannot live on the single page.

## Security requirements

- **Never commit secrets.** No API keys, tokens, or credentials in source,
  tests, docs, or commit messages. `.env` is gitignored; keep it that way.
- **`GEMINI_API_KEY` is server-only.** It is read inside `lib/gemini.ts`, which
  is imported only by route handlers. Never prefix it with `NEXT_PUBLIC_` and
  never pass it to a client component — that would ship the key to the browser.
- **Never commit the database.** `data/` holds real logged meals and is
  gitignored.
- **Validate every request body** in route handlers before touching the DB. All
  SQL goes through `better-sqlite3` prepared statements with bound parameters —
  never build SQL by string concatenation.
- **Treat user text and photos as untrusted input to the model.** The
  `responseSchema` constraint plus numeric validation in `lib/gemini.ts` is the
  defence against prompt injection steering the output; do not relax it.
- **Render model output as text only.** Never pass `note` or an item name to
  `dangerouslySetInnerHTML`.
- **Deployment caveat:** this app has no authentication and no rate limiting.
  Exposing it publicly would let anyone spend the owner's Gemini quota and read
  and write a single shared log. If a change makes public deployment a goal,
  auth and rate limiting must land in the same change.

## Git workflow

- `main` is the default branch and tracks `origin`
  (`https://github.com/conceptwebworld26/calorie-tracker`).
- Work on a branch: `feat/...`, `fix/...`, `docs/...`, `chore/...`.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:`,
  `chore:`, `refactor:`). Subject in the imperative mood, under ~72 characters.
- **Never force-push and never rewrite pushed history.**
- Keep commits focused. Do not mix documentation changes with application
  changes, or bundle unrelated fixes.
- Run the verification gate before every commit, and `git status` before
  staging, so generated files (`.next/`, `data/`, `*.tsbuildinfo`) never slip
  in.

## Rules for modifying existing code

- **Read before editing.** The dated logs in `docs/` explain why things are the
  way they are. If you are about to undo one of those decisions, say so
  explicitly rather than silently reversing it.
- **Match the surrounding style** rather than importing a different idiom.
- **Do not reformat or "tidy" code you were not asked to change.** Unrelated
  churn makes review harder.
- **Schema changes need care.** `lib/db.ts` runs `CREATE TABLE IF NOT EXISTS`
  at import time; there are no migrations. Adding a column to an existing
  database requires an explicit `ALTER TABLE` guard, not just editing the
  `CREATE TABLE` text — that only affects fresh databases.
- **Keep `Food` POST-able.** `NutritionAnalysis.items[]` are plain `Food`
  objects specifically so they can go straight to `/api/log`. Preserve that.
- **Preserve the confirmation step.** Do not add a path that logs AI estimates
  automatically.

## Rules for adding dependencies

- Prefer the standard library, an existing dependency, or ~30 lines of local
  code over a new package.
- Before adding one, justify it in the pull request: what it does, why it
  cannot reasonably be done without it, and its size and maintenance status.
- Never add a package that requires a new external service or account to work.
- `better-sqlite3` compiles natively and is allow-listed in `package.json`
  (`allowScripts`). Any new native dependency needs the same treatment and
  should be flagged, since it affects every contributor's install.
- Do not upgrade Next.js, React, or Tailwind major versions as a side effect of
  unrelated work.

## Testing expectations

- There is no test framework today. Introducing one (Vitest is the natural fit
  for this stack) is a welcome standalone change — but it should land as its
  own pull request, not bundled into a feature.
- Until then, every change must pass
  `npx tsc --noEmit && npm run lint && npm run build`, and be exercised
  manually in the browser.
- Once a test framework exists, new logic in `lib/` must ship with tests. The
  highest-value first targets are the pure functions in `lib/gemini.ts`
  (`sumTotals`, `isValidItem`) and the request validation in the route
  handlers — none of them need a network call or a browser.
- Never write a test that calls the real Gemini API. Mock the client.

## Documentation expectations

- **Dated decision logs.** Any change with a non-obvious design decision gets a
  `docs/YYYY-MM-DD-short-slug.md` covering *what was built*, *technical choices
  and why*, *verification*, and *known simplifications*. Follow the format of
  the existing three.
- **Keep the standing docs current.** If a change alters behaviour, update
  `docs/product.md`; if it alters structure, update `docs/architecture.md`; if
  it completes or reorders work, update `docs/roadmap.md`. Update this file when
  a rule or command changes.
- **Never document a feature that does not exist yet.** Planned work belongs in
  the roadmap, clearly marked as planned — not in the README's feature list.

## AI / Gemini integration guidelines

All Gemini access goes through `analyzeNutrition()` in `lib/gemini.ts`. Both
`/api/analyze/*` routes are thin wrappers that differ only in the parts they
pass in. Add new AI features the same way, not by calling the SDK directly from
a route.

Rules:

- **Structured output only.** Requests set `responseMimeType: "application/json"`
  plus a `responseSchema`. Never parse free text or fish JSON out of a markdown
  fence.
- **`total` is never requested from the model.** It is deliberately absent from
  the schema and summed from `items` server-side, so the total always matches
  the line items shown.
- **Validate before returning.** `isValidItem` drops anything not fully
  numeric; without it a bad item reaches the UI as `NaN`.
- **Low temperature (0.2).** Nutrition lookup should be repeatable, not
  creative. Do not raise it.
- **Errors are typed.** Throw `GeminiError(message, status)` so routes can map
  failures to a real HTTP status; `lib/useAnalysis.ts` translates those into
  human-readable messages for the UI. Keep both halves in sync.
- **The model id lives in one place** — `MODEL` in `lib/gemini.ts`, overridable
  via `GEMINI_MODEL`. Do not hard-code a model anywhere else.
- **Input limits are enforced server-side**: 500 characters for descriptions,
  5MB and a JPEG/PNG/WebP/HEIC allow-list for photos. The client pre-checks the
  same limits for a faster failure; if you change one, change both
  (`app/api/analyze/image/route.ts` and `lib/useAnalysis.ts` currently declare
  them separately).
- **Every call costs money and latency.** There is no caching — identical
  lookups hit the API twice. Bear that in mind before adding call sites.

## Project-specific constraints

- **`GET /api/log` is day-scoped** using the *server's* local midnight, while
  `logged_at` is stored as a UTC ISO string. This is correct only while the
  server and the user share a timezone — true for local single-user use, and a
  real bug the moment it is hosted. Any history or date-picker feature must fix
  this properly.
- **AI item ids repeat.** Ids are generated per analysis (`ai-1`, `ai-2`, ...),
  so `food_id` is not unique in `log_entries`. Harmless — `log_id` is the
  primary key — but `food_id` cannot be used to group or de-duplicate AI
  entries.
- **AI and catalog entries are indistinguishable once logged.** There is no
  `source` column.
- **Each Add logs exactly one serving.** There is no quantity control anywhere.
- **`better-sqlite3` is synchronous** and blocks the event loop. Fine at this
  scale; do not introduce large or unbounded queries.
- **Tab panels stay mounted** and are hidden via the `hidden` attribute, so an
  in-progress analysis survives a tab switch. Do not "optimize" this into
  conditional rendering.
- **`POST /api/log` trusts the client's numbers.** It checks types but not
  ranges or string lengths. Acceptable for a local single-user tool; it is the
  first thing to harden if the app is ever hosted.

## Design decision log

- `docs/2026-08-14-initial-build.md` — SQLite vs. localStorage, the static food
  list, denormalized log entries, the day-scoped log query.
- `docs/2026-09-03-gemini-nutrition-lookup.md` — the AI routes: model
  substitution, structured output via `responseSchema`, server-side totals,
  multipart image upload, and why these routes never write to the database.
- `docs/2026-09-03-ai-add-food-ui.md` — the UI: why both AI paths share one
  confirmation step, why nothing is logged without an explicit press,
  sequential vs. parallel POSTs, error translation, the object-URL preview.
