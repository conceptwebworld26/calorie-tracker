# Calorie Tracker

A single-page calorie tracker with three ways to log a meal: tap a common food,
describe it in plain English, or photograph it. The last two use Google's Gemini
API to estimate nutrition, so there is no food database to search.

No accounts, no cloud, no subscription. Everything is stored in a local SQLite
file.

```
┌─────────────────────────────────────────────┐
│ TODAY'S CALORIES                            │
│ 1,847          142g protein  180g carbs ... │
├─────────────────────────────────────────────┤
│ Today's log                                 │
│   Chicken Breast   100g · 165 kcal   Remove │
│   White Rice       1 cup · 205 kcal  Remove │
├─────────────────────────────────────────────┤
│ Add a food                                  │
│  [ Common foods ] [ Describe ] [ Photo ]    │
└─────────────────────────────────────────────┘
```

## Why

Most calorie trackers ask you to find your exact meal in a database of hundreds
of thousands of branded entries, confirm a portion, then confirm a serving unit.
That is a lot of friction for "I had chicken and rice," and friction is why
people stop tracking.

This app keeps one screen and three ways in. Two of them accept a description or
a photo and give you an estimate to confirm. The trade-off is deliberate: an
estimate you actually record beats a precise figure you never enter.

## Features

- **Quick-add from a built-in catalogue** of 24 common foods, with live search
- **Describe a meal in plain English** — "grilled chicken with rice and salad" —
  and get a per-food nutrition estimate
- **Photograph a plate** (JPEG, PNG, WebP, or HEIC, up to 5MB) and get the same
- **A confirmation step for every AI estimate** — items arrive as a checklist,
  and nothing is written to your log until you press Add
- **A running daily total** of calories, protein, carbs, and fat, updating live
- **Per-entry removal**, with the log as the source of truth
- **Local persistence** via SQLite — survives refreshes and restarts
- **Dark mode** throughout

The log covers **today only**, and each Add records exactly **one serving**.
Adjustable quantities and a history view are on the [roadmap](docs/roadmap.md),
not in the app.

## How it works

All three input methods converge on a single endpoint, so everything persists
identically.

```
Common foods ──────────────────────────────────► POST /api/log ──► SQLite
                                                        ▲
Describe ──┐                                            │
           ├─► POST /api/analyze/{text,image}           │
Photo ─────┘        │                                   │
                    ▼                                   │
              Gemini (structured JSON)                  │
                    │                                   │
                    ▼                                   │
           Confirmation checklist ──── you press Add ───┘
```

The two analysis endpoints **never write to the database**. They return an
estimate; you decide what becomes a log entry.

Two details make the estimates trustworthy enough to act on:

- **Totals are computed server-side** from the line items, never taken from the
  model — so the total always matches the foods you can see.
- **Every item is validated as fully numeric** before it leaves the server, so a
  malformed response cannot reach the UI as `NaN`.

Log entries store a *copy* of the nutrition values at the time they were logged,
so changing the food catalogue later can never rewrite your history.

## Tech stack

| Concern    | Choice |
|------------|--------|
| Framework  | Next.js 16 (App Router, Turbopack) |
| Language   | TypeScript 5, strict |
| UI         | React 19 |
| Styling    | Tailwind CSS v4 |
| Database   | better-sqlite3 — a local file, no external service |
| AI         | `@google/genai` (Gemini) |
| Linting    | ESLint 9 + `eslint-config-next` |

## AI capabilities

The two AI features are handled by one function, `analyzeNutrition()` in
`lib/gemini.ts`, which both routes call.

- **Model:** `gemini-3.5-flash-lite` by default, overridable via `GEMINI_MODEL`.
- **Structured output.** Requests are constrained by a `responseSchema` and
  return JSON directly — no parsing free text out of a markdown fence.
- **Split into line items.** Composite dishes stay whole (lasagna is one item);
  separable meals are split (chicken / rice / salad).
- **An assumption note.** The model states its main assumption — a cooking
  method, or a portion size you did not give.
- **Temperature 0.2.** Nutrition lookup should be repeatable, not creative.
- **Graceful degradation.** Without `GEMINI_API_KEY`, the two AI tabs show a
  setup message and the rest of the app works normally.

Estimates are estimates. They come from a language model's own knowledge, not
from a nutrition database, and they are not suitable for clinical or medical
use.

## Getting started

**Requirements:** Node.js 20+ and npm. `better-sqlite3` compiles natively on
install, so you will need the usual build tools for your platform (Xcode CLT on
macOS, `build-essential` on Linux, Visual Studio Build Tools on Windows).

```bash
git clone https://github.com/conceptwebworld26/calorie-tracker.git
cd calorie-tracker
npm install
cp .env.example .env     # then add your key — see below
npm run dev
```

Open <http://localhost:3000>. The SQLite database is created automatically at
`data/app.db` on first run.

### Environment variables

Copy `.env.example` to `.env` and fill it in. **`.env` is gitignored — never
commit real keys.**

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `GEMINI_API_KEY` | For the AI tabs only | — | Authenticates with Gemini. Get one from [Google AI Studio](https://aistudio.google.com/apikey). |
| `GEMINI_MODEL` | No | `gemini-3.5-flash-lite` | Overrides the model used for estimation. |

Without a key, quick-add, the log, and the totals all work — only the Describe
and Photo tabs are unavailable.

## Development commands

```bash
npm run dev        # dev server on http://localhost:3000
npm run build      # production build (includes a full TypeScript pass)
npm start          # serve the production build
npm run lint       # ESLint
npx tsc --noEmit   # type-check only
```

## Testing

**There is no test framework yet** — no test files, no `test` script.
Verification is currently this gate plus manual exercise in the browser:

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Adding a test framework is a priority on the [roadmap](docs/roadmap.md), and a
good first contribution. Vitest is the natural fit; the pure functions in
`lib/gemini.ts` and the route-handler validation are the highest-value first
targets, and neither needs a network call.

## Project structure

```
app/
  page.tsx                     Main (and only) page — client component, owns log state
  layout.tsx                   Root layout, fonts, metadata
  api/log/route.ts             GET today's entries · POST an entry
  api/log/[id]/route.ts        DELETE an entry
  api/analyze/text/route.ts    POST — estimate nutrition from a description
  api/analyze/image/route.ts   POST — estimate nutrition from a photo
components/
  Summary.tsx                  Sticky header with calorie/macro totals
  AddFood.tsx                  Tab container: Common foods / Describe / Photo
  FoodSearch.tsx               Search input + filtered food grid
  FoodCard.tsx                 One food's macros + Add button
  DescribeFood.tsx             Textarea → /api/analyze/text
  PhotoFood.tsx                File picker + preview → /api/analyze/image
  AnalysisResult.tsx           Shared confirmation checklist for both AI paths
  FoodLog.tsx                  Today's logged entries
  LogEntryRow.tsx              One entry + Remove
  Spinner.tsx                  Inline loading spinner
  ErrorNotice.tsx              Error box with optional retry
lib/
  types.ts                     Food / LogEntry / NutritionAnalysis
  foods.ts                     Static catalogue: 24 common foods
  db.ts                        SQLite connection + table setup
  gemini.ts                    Gemini client, prompt, schema, validation
  useAnalysis.ts               Client hook for both AI routes
docs/                          Product, architecture, roadmap, decision logs
data/                          SQLite file, created at runtime (gitignored)
```

## Documentation

- [Product](docs/product.md) — what it does, who it is for, what is planned
- [Architecture](docs/architecture.md) — how it actually works
- [Roadmap](docs/roadmap.md) — completed, next, and future
- [CLAUDE.md](CLAUDE.md) — development conventions and constraints
- `docs/YYYY-MM-DD-*.md` — dated decision logs explaining past choices

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) for the full picture. Next up:

1. Adjustable serving quantities
2. A test framework
3. Timezone-correct day scoping, then a history view
4. Clear the whole day's log
5. Custom foods

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup,
branch naming, the verification gate, and pull request expectations.

Good first issues: adding the test framework, sharing the duplicated image
limits between client and server, or surfacing the silent failure in
`handleAdd`.

## Security

**Do not open a public issue for a security vulnerability.** See
[SECURITY.md](SECURITY.md) for how to report one.

Two things worth knowing before you deploy this:

- **There is no authentication and no rate limiting.** The app is built as a
  local, single-user tool. A publicly reachable instance would let anyone read
  and write the same log, and spend your Gemini quota.
- **Never commit `.env` or `data/`.** Both are gitignored; keep them that way.

## License

[MIT](LICENSE) © 2026 conceptwebworld26
