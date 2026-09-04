# Calorie Tracker

A single-page calorie tracker with three ways to add food: pick from 24 common
foods, describe a meal in plain English, or upload a photo — the last two use
Gemini to estimate nutrition. A running calorie/protein/carb/fat total sits at
the top. No login, no accounts — everything is stored locally and persists
across page refreshes.

> Note: this project also has an `AGENTS.md`, auto-generated and kept up to
> date by `next dev`. It holds framework-level rules for this Next.js version
> and is unrelated to the app-specific info below.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4** for styling
- **better-sqlite3** for local, file-based persistence (no external DB service)
- **@google/genai** (Gemini) for AI nutrition estimation from text or photos

## How to run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The SQLite database file
is created automatically at `data/app.db` on first run (gitignored).

`GEMINI_API_KEY` must be set in `.env` for the `/api/analyze/*` routes; the rest
of the app works without it. `GEMINI_MODEL` optionally overrides the model
(default `gemini-3.5-flash-lite`).

## Folder structure

```
app/
  page.tsx              Main (and only) page — client component, holds log state
  layout.tsx            Root layout, page metadata
  api/log/route.ts      GET (today's entries), POST (add an entry)
  api/log/[id]/route.ts DELETE (remove an entry by logId)
  api/analyze/text/route.ts   POST — estimate nutrition from a text description
  api/analyze/image/route.ts  POST — estimate nutrition from an uploaded photo
components/
  Summary.tsx            Sticky header with calorie/macro totals
  AddFood.tsx             Tab container: Common foods / Describe / Photo
  FoodSearch.tsx          Search input + filtered food grid (quick-add tab)
  FoodCard.tsx            One food's macros + Add button
  DescribeFood.tsx        Textarea → POST /api/analyze/text
  PhotoFood.tsx           File picker + preview → POST /api/analyze/image
  AnalysisResult.tsx      Shared confirm step: check items, then add to log
  Spinner.tsx             Inline loading spinner
  ErrorNotice.tsx         Friendly error box with optional retry
  FoodLog.tsx             Today's logged entries
  LogEntryRow.tsx         One log entry + Remove button
lib/
  types.ts               Food / LogEntry / NutritionAnalysis types
  foods.ts                Static seed data: 24 common foods with macros
  db.ts                   SQLite connection + table setup
  gemini.ts               Gemini client, prompt, response schema, validation
  useAnalysis.ts          Client hook: calls the AI routes, maps errors
data/
  app.db                  SQLite database file (gitignored, created at runtime)
docs/
  YYYY-MM-DD-*.md          Dated decision logs
```

## Data model

**Food** (static, in `lib/foods.ts` — not stored in the DB):
```ts
{ id, name, calories, protein, carbs, fat, servingSize }
```

**LogEntry** (a row in the `log_entries` SQLite table):
```ts
Food & { logId, loggedAt }
```

**NutritionAnalysis** (what both `/api/analyze/*` routes return — never stored):
```ts
{ items: Food[], total: { calories, protein, carbs, fat }, note?: string }
```

Log entries store a *copy* of the food's nutrition values at the time they
were logged (denormalized), so editing the food catalog later can't change
history. `GET /api/log` only returns entries from the current local day.

`items[]` are plain `Food` objects, so one can be POSTed straight to `/api/log`
with no translation. Their ids are generated as `ai-1`, `ai-2`, … so they can't
collide with catalog ids. `total` is summed server-side from `items` rather than
taken from the model, so it always matches the line items.

Ids are numbered per analysis, so `ai-1` recurs across lookups and `food_id` is
not unique in `log_entries`. Harmless — `log_id` is the primary key — but it
means `food_id` can't group or de-duplicate AI entries.

## How adding food works

All three paths end at `POST /api/log`, so everything persists the same way:

- **Common foods** — `FoodCard` Add → one POST.
- **Describe / Photo** — the route returns a `NutritionAnalysis`, which
  `AnalysisResult` shows as a checklist. Nothing is written until the user
  presses "Add N to log", which calls `handleAddMany` in `app/page.tsx` — one
  sequential POST per checked item (sequential so `logged_at` preserves the
  confirmed order).

## Design decisions

See `docs/2026-08-14-initial-build.md` for the reasoning behind SQLite vs.
localStorage, the static food list, denormalized log entries, and the
day-scoped log query.

See `docs/2026-09-03-gemini-nutrition-lookup.md` for the AI routes: the model
substitution, structured output via `responseSchema`, server-side totals,
multipart image upload, and why these routes never write to the database.

See `docs/2026-09-03-ai-add-food-ui.md` for the UI: why both AI paths share one
confirmation step, why nothing is logged without an explicit press, sequential
vs. parallel POSTs, error translation, and the object-URL preview.

## What's next

Nothing is currently in progress. Possible future directions if the app grows:

- A date picker / history view (the log is currently "today only")
- Editable serving quantities (currently each Add logs exactly one serving, and
  AI estimates can be included or excluded but not adjusted)
- A way to add custom foods to the catalog
- Deleting the whole day's log at once
- A `source` column on `log_entries` to distinguish AI estimates from catalog
  foods (they're indistinguishable once logged)
- Caching identical lookups — every `/api/analyze` call currently hits Gemini
- Client-side image downscaling instead of rejecting photos over 5MB
- A test framework — there is still none, and verification is manual
