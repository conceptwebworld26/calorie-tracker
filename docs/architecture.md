# Architecture

The architecture as it actually exists today. Nothing here is aspirational — if
a layer is missing (authentication, caching, tests), this document says so
rather than describing a plan.

---

## Shape of the system

A single Next.js application. There is no separate backend service, no external
database, and no build-time data pipeline. The only external dependency at
runtime is the Gemini API, and the app still runs without it (minus the two AI
features).

```
┌──────────────────────────────────────────────────────────┐
│ Browser                                                  │
│                                                          │
│  app/page.tsx  ("use client")                            │
│    owns: entries[], loading, pendingId                   │
│    derives: today's totals                               │
│      │                                                   │
│      ├── Summary          (totals)                       │
│      ├── FoodLog          (entries, onRemove)            │
│      └── AddFood          (onAdd, onAddMany, pendingId)  │
│            ├── FoodSearch  → FoodCard   [static catalog] │
│            ├── DescribeFood ─┐                           │
│            └── PhotoFood ────┴→ useAnalysis → AnalysisResult
└──────────┬───────────────────────────────────────────────┘
           │ fetch (JSON, or multipart for photos)
┌──────────▼───────────────────────────────────────────────┐
│ Next.js route handlers (Node runtime)                    │
│                                                          │
│  /api/log          GET  today's entries                  │
│                    POST one entry                        │
│  /api/log/[id]     DELETE one entry                      │
│  /api/analyze/text  POST → lib/gemini ─┐                 │
│  /api/analyze/image POST → lib/gemini ─┤                 │
└──────────┬─────────────────────────────┼────────────────-┘
           │                             │ HTTPS
┌──────────▼──────────────┐   ┌──────────▼──────────────┐
│ SQLite (better-sqlite3) │   │ Google Gemini API       │
│ data/app.db, WAL mode   │   │ gemini-3.5-flash-lite   │
└─────────────────────────┘   └─────────────────────────┘
```

## Frontend

**Next.js 16 App Router, React 19, Tailwind CSS v4.**

`app/layout.tsx` is the only server component of consequence: it sets metadata,
loads the Geist fonts via `next/font/google`, and renders a flex-column body.

`app/page.tsx` is a client component and the **single owner of log state**. It
holds `entries`, `loading`, and `pendingId`, and passes callbacks down. No child
component fetches log data — this keeps the summary header, the log list, and
the add panel from ever disagreeing about what has been logged.

Four state-changing operations live there:

| Handler | Behaviour |
|---------|-----------|
| `handleAdd` | One POST for a single catalogue food. Sets `pendingId` so that card's button disables while in flight. Silently gives up on failure. |
| `handleAddMany` | One **sequential** POST per confirmed AI item. Sequential rather than parallel so `logged_at` preserves the order shown in the confirmation list — `GET /api/log` sorts by it. Keeps whatever saved before a failure, then throws so the caller can show an error. |
| `handleRemove` | Optimistic: drops the row from state immediately, then DELETEs. Refetches the whole log to revert if the request fails. |
| `totals` | A `useMemo` reduce over `entries`. Derived, never stored — the header cannot drift from the list. |

**Components** (`components/`) are presentational: props in, callbacks out, no
fetching. Two are worth noting:

- **`AddFood`** renders three tab panels and keeps **all three mounted**,
  toggling the `hidden` attribute rather than conditionally rendering. This is
  deliberate — an in-progress analysis survives a tab switch.
- **`AnalysisResult`** is the shared confirmation step for both AI paths. It
  owns the checkbox selection and the save-in-progress state, and computes its
  own subtotal from the checked items. Both AI tabs render the same component
  with a different `emptyMessage`, so the two paths cannot diverge in
  behaviour.

**`lib/useAnalysis.ts`** is the one custom hook. It owns the request lifecycle
for both AI routes (`status`, `result`, `error`) and holds a `requestId` ref so
a slow earlier response cannot overwrite a newer one. It also maps HTTP failures
to human-readable messages — API 400s pass through because they are already
specific, everything else gets a plain-language stand-in.

## Backend

Four **Next.js route handlers**, all running on the Node runtime (required —
`better-sqlite3` is a native module and cannot run on the Edge runtime).

### `GET /api/log`

Returns today's entries, oldest first. Aliases `snake_case` columns to
`camelCase` in the `SELECT` so nothing downstream sees database naming.

Day scoping uses `startOfTodayISO()`: the server's **local** midnight, converted
to a UTC ISO string, compared against `logged_at`. This is correct only while
the server and the user share a timezone — true for local single-user use, and
a genuine bug the moment the app is hosted. Any history feature must fix it.

### `POST /api/log`

Validates the payload has an id, a name, a serving size, and four numeric
macros, then inserts and returns the created `LogEntry` with a 201. It checks
**types but not ranges or string lengths** — a client can post a 10-million
calorie entry. Acceptable for a local single-user tool; the first thing to
harden if the app is hosted.

### `DELETE /api/log/[id]`

Parses the id as an integer, deletes by primary key, returns 404 if nothing
matched. Note `Number.isInteger` accepts negative ids — harmless, since none
exist to match.

### `POST /api/analyze/text` and `POST /api/analyze/image`

Both are thin wrappers over `analyzeNutrition()`. They differ only in what they
validate and the parts they pass in:

- **text** — requires a non-empty `description` of ≤ 500 characters.
- **image** — requires an `image` file field, of type JPEG/PNG/WebP/HEIC, ≤ 5MB.
  Encodes it to base64 server-side, so the browser does not have to before
  upload.

Both catch `GeminiError` and map its `status` onto the HTTP response.

**Neither route touches the database.** They are pure estimate endpoints;
persistence only happens when the user confirms and the client calls
`POST /api/log`.

## Database

**SQLite via `better-sqlite3`**, file-based at `data/app.db`. No server, no
connection string, no external service. WAL journal mode is enabled.

`lib/db.ts` creates the `data/` directory if missing, opens the database, and
runs `CREATE TABLE IF NOT EXISTS` **at import time**. In development the
connection is cached on `globalThis` so hot reload does not open a new handle
on every edit.

There is **one table** and **no migration system**. Changing the schema of an
existing database requires an explicit `ALTER TABLE` — editing the
`CREATE TABLE` text only affects databases created from scratch.

```sql
CREATE TABLE IF NOT EXISTS log_entries (
  log_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  food_id      TEXT NOT NULL,
  name         TEXT NOT NULL,
  calories     REAL NOT NULL,
  protein      REAL NOT NULL,
  carbs        REAL NOT NULL,
  fat          REAL NOT NULL,
  serving_size TEXT NOT NULL,
  logged_at    TEXT NOT NULL   -- UTC ISO 8601
)
```

There are **no indexes** beyond the primary key. `GET /api/log` scans on
`logged_at`; at single-user volumes this is irrelevant, and it is the obvious
first index if history lands.

### Data models

Defined in `lib/types.ts`:

```ts
Food              { id, name, calories, protein, carbs, fat, servingSize }
LogEntry          Food & { logId, loggedAt }
MacroTotals       { calories, protein, carbs, fat }
NutritionAnalysis { items: Food[], total: MacroTotals, note?: string }
```

Two decisions are load-bearing:

1. **Log entries are denormalized.** A row stores a *copy* of the nutrition
   values, not a reference to a catalogue food. Editing `lib/foods.ts` can never
   retroactively change what a past day reports.
2. **`NutritionAnalysis.items[]` are plain `Food` objects.** That is why an AI
   item can be POSTed straight to `/api/log` with no translation layer.

**Known wart:** AI item ids are numbered per analysis (`ai-1`, `ai-2`, ...), so
they repeat across lookups and `food_id` is **not unique** in `log_entries`.
Harmless, since `log_id` is the primary key — but `food_id` cannot be used to
group or de-duplicate AI entries. There is also no `source` column, so once
logged, an AI estimate is indistinguishable from a catalogue food.

## Authentication

**There is none.** No login, no sessions, no user table, no authorization checks
on any route. Every request is anonymous and every request sees the same single
log.

This is a deliberate fit for a local single-user tool, but it has direct
consequences for deployment, covered under *Security posture* below.

## APIs

### Internal

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `GET` | `/api/log` | — | `LogEntry[]` (today, ascending) |
| `POST` | `/api/log` | `Food` (JSON) | `LogEntry`, 201 |
| `DELETE` | `/api/log/[id]` | — | `{ ok: true }`, or 404 |
| `POST` | `/api/analyze/text` | `{ description }` (JSON) | `NutritionAnalysis` |
| `POST` | `/api/analyze/image` | `image` (multipart) | `NutritionAnalysis` |

Errors are `{ error: string }` with a meaningful status: 400 for bad input, 404
for a missing entry, 500 for missing configuration, 502 for an upstream Gemini
failure.

### External

**Google Gemini**, via `@google/genai`. The only outbound network call the app
makes.

## AI / Gemini integration

All of it lives in `lib/gemini.ts`, behind one function: `analyzeNutrition()`.
It accepts an array of text strings and/or SDK `Part` objects, so the text and
image routes share every line of logic below.

**Model** — `gemini-3.5-flash-lite` by default, overridable with `GEMINI_MODEL`.
Chosen after `gemini-2.5-flash-lite` began rejecting `generateContent` for new
users and named this as its replacement.

**Client caching** — the `GoogleGenAI` instance is cached on `globalThis` in
development, same pattern as the database handle.

**Structured output** — every request sets
`responseMimeType: "application/json"` plus a `responseSchema`, so the response
is parsed directly rather than being extracted from a markdown fence. The schema
requires `name`, `servingSize`, and four numeric macros per item, plus an
optional `note`.

**The schema deliberately has no `total` field.** Totals are summed from the
line items on our side (`sumTotals`), so the total shown can never disagree with
the items shown — even if the model's own arithmetic is wrong.

**System instruction** — constrains the model to one item per distinct food,
splitting composite dishes only when separable, USDA-style reference values,
bare numbers with no ranges or units, and an empty `items` array when the input
is not food at all.

**Temperature 0.2** — nutrition lookup should be repeatable, not creative.

**Validation** — every returned item passes through `isValidItem`, which drops
anything whose macros are not finite numbers. Without it, a malformed item would
reach the UI as `NaN` totals. Survivors are rounded (calories to whole numbers,
macros to one decimal) and assigned `ai-N` ids, prefixed so they cannot collide
with catalogue ids.

**Error handling** — everything failable throws `GeminiError(message, status)`:
500 for a missing API key, 502 for a request failure, an empty response, or
malformed JSON. Routes map that status straight onto the response, and
`useAnalysis` turns it into a sentence a person can act on.

**Prompt injection** — user text and photos are untrusted input. The defence is
that the model's output is schema-constrained and numerically validated, and is
rendered as text by React (never `dangerouslySetInnerHTML`), so a malicious
description cannot produce anything more interesting than a wrong estimate or a
strange `note`.

**No caching, no rate limiting.** Every analysis is a live API call. Two
identical descriptions cost two calls.

## Food and nutrition data sources

Two sources, and no third-party nutrition database:

1. **The static catalogue** — `lib/foods.ts`, 24 hand-entered common foods with
   USDA-style reference values. Compiled into the bundle; not in the database,
   not fetched, not editable at runtime.
2. **Gemini estimates** — generated per request from the model's own knowledge,
   instructed to use USDA-style reference values. These are **estimates**, not
   looked-up facts, and the app presents them as such.

There is no integration with USDA FoodData Central, Open Food Facts, Nutritionix,
or any other nutrition API.

## Data flow

**Adding a catalogue food**

```
FoodCard Add → onAdd → POST /api/log → INSERT → 201 LogEntry
                                                  → appended to entries
                                                  → totals recompute
```

**Adding via text or photo**

```
DescribeFood / PhotoFood
  → useAnalysis → POST /api/analyze/{text,image}
      → analyzeNutrition() → Gemini → validate → sum totals
  → NutritionAnalysis → AnalysisResult (checklist, nothing saved yet)
      → user unchecks any wrong items, presses "Add N to log"
          → handleAddMany → one sequential POST /api/log per item
              → appended to entries → totals recompute
```

The gap between the two lines of that second block is the point: **the analysis
routes never write anything.** A user always sees and approves an estimate
before it becomes a log entry.

**Page load**

```
mount → GET /api/log → entries → totals derived
```

## External services

| Service | Required | Used for | Failure behaviour |
|---------|----------|----------|-------------------|
| Google Gemini API | Only for the two AI tabs | Nutrition estimation from text and photos | Routes return 500 (unconfigured) or 502 (upstream); the UI shows a friendly message. Catalogue add, log, and delete keep working. |
| Google Fonts | Build time | Geist / Geist Mono, via `next/font` | Fonts are self-hosted after build; no runtime dependency. |

No analytics, no error reporting, no telemetry.

## Configuration

All configuration is environment variables, read **server-side only**. Nothing
is prefixed `NEXT_PUBLIC_`, so no configuration reaches the browser.

| Variable | Required | Default | Read in |
|----------|----------|---------|---------|
| `GEMINI_API_KEY` | For AI routes only | — | `lib/gemini.ts` |
| `GEMINI_MODEL` | No | `gemini-3.5-flash-lite` | `lib/gemini.ts` |
| `NODE_ENV` | Set by Next.js | — | `lib/db.ts`, `lib/gemini.ts` (dev-only client caching) |

`.env` is gitignored; `.env.example` documents the shape with placeholders.

## Build and tooling

- **Turbopack** for both dev and production builds.
- **TypeScript strict**, with `@/*` aliased to the repository root.
- **ESLint 9** flat config, extending `eslint-config-next` core-web-vitals and
  typescript presets.
- **Tailwind v4** through `@tailwindcss/postcss` — no `tailwind.config.js`;
  configuration lives in CSS.
- `better-sqlite3` compiles natively on install and is allow-listed under
  `allowScripts` in `package.json`.

Build output: `/` is prerendered as static content; all four API routes are
server-rendered on demand.

## Security posture

What exists:

- The Gemini key is server-only and never reaches the client bundle.
- All SQL uses prepared statements with bound parameters — no string-built SQL.
- Both AI routes validate size, type, and length before spending an API call.
- Model output is schema-constrained, numerically validated, and rendered as
  text only.
- `.env` and `data/` are gitignored.

What does not exist, and matters if this is ever hosted:

- **No authentication or authorization.** Every visitor shares one log.
- **No rate limiting on `/api/analyze/*`.** A public instance lets anyone spend
  the owner's Gemini quota.
- **No range or length validation on `POST /api/log`.** Types are checked;
  values are not.
- **No CSRF protection**, which matters only once there is a session to forge.
- **Day scoping breaks across timezones**, as described above.

These are consistent with a local single-user tool and are documented rather
than fixed. Deploying publicly requires addressing at least the first three in
the same change.

## Testing

**There is no test framework, no test files, and no `test` script.**
Verification today is `npx tsc --noEmit`, `npm run lint`, `npm run build`, and
manual exercise in the browser. The pure functions in `lib/gemini.ts`
(`sumTotals`, `isValidItem`) and the route validation logic are the natural
first targets whenever a framework is introduced.
