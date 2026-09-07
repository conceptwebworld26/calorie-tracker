# Plate

**Live demo: <https://calorietracker.conceptwebworld.com>**

A single-page daily food log with three ways to record a meal: tap a common
food, describe it in plain English, or photograph it. The last two use Google's
Gemini API to estimate nutrition, so there is no food database to search.

No accounts, no sign-up, no subscription, no database. Your log and your goals
are kept in your own browser — open the link and start logging. Nothing is
shared with anyone, and nothing follows you to another device.

```
┌──────────────────────────────────────────────────────────────────┐
│ Plate  daily food log                          Monday, 7 September│
│ ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
├────────────────────────┬─────────────────────────────────────────┤
│ Eaten today            │ Add food     Adding to [B][L][D][S]     │
│ 1,255                  │ [ Common foods ][ Describe ][ Photo ]   │
│ of 2,000 kcal 745 left │  Search 24 common foods                 │
│ ████████████░░░░░░░░░  │  ┌──────────────┐ ┌──────────────┐      │
│                        │  │ Chicken 165  │ │ Rice 205     │      │
│ ● Protein ███░ 91/150g │  │ P31 C0 F3.6  │ │ P4 C45 F0.4  │      │
│ ● Carbs   ███░ 146/225 │  └──────────────┘ └──────────────┘      │
│ ● Fat     ██░░  36/55g │                                         │
│                        │ Today's log                             │
│ Breakfast     355 kcal │ Breakfast  3 items            355 kcal  │
│ Lunch         425 kcal │ ───────────────────────────────────────  │
│ Dinner        311 kcal │  Rolled Oats    40g at 7:12    150 kcal │
│ Snacks        164 kcal │  Greek Yogurt  170g at 7:14    100 kcal │
│ Edit goals             │ Lunch      3 items            425 kcal  │
└────────────────────────┴─────────────────────────────────────────┘
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
- **Daily calorie and macro goals**, editable in place, with a progress bar that
  reads green under 75% of the goal, amber to 100%, and red past it
- **Macro bars** for protein, carbs, and fat against their own targets
- **Meals** — every entry is filed under Breakfast, Lunch, Dinner, or Snacks,
  with per-meal subtotals and a picker that defaults to the current time of day
- **A running daily total**, updating live as entries are added or removed
- **Per-entry removal**, with the log as the source of truth
- **Local persistence** in your browser — survives refreshes and restarts, and
  is never sent anywhere
- **Responsive and theme-aware** — a two-column desktop layout with a sticky
  summary rail, stacking on mobile, in light and dark

The log covers **today only**, and each Add records exactly **one serving**.
Adjustable quantities and a history view are on the [roadmap](docs/roadmap.md),
not in the app.

## How it works

All three input methods converge on the same write, so everything persists
identically.

```
Common foods ──────────────────────────────► addEntry() ──► localStorage
                                                  ▲
Describe ──┐                                      │
           ├─► POST /api/analyze/{text,image}     │
Photo ─────┘        │                             │
                    ▼                             │
              Gemini (structured JSON)            │
                    │                             │
                    ▼                             │
           Confirmation checklist ─ you press Add ┘
```

The two analysis endpoints are the only server code, and they **store nothing**.
They return an estimate; you decide what becomes a log entry. An uploaded photo
is held in memory for the length of the request and never written to disk.

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
| Storage    | `localStorage` — no database, no server-side state |
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

**Requirements:** Node.js 20+ and npm. Every dependency is pure JavaScript, so
there is no native build step and no platform toolchain to install.

```bash
git clone https://github.com/conceptwebworld26/calorie-tracker.git
cd calorie-tracker
npm install
cp .env.example .env     # then add your key — see below
npm run dev
```

Open <http://localhost:3000>. There is nothing to set up: the log is created in
your browser the first time you add a food.

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
`lib/gemini.ts`, `parseGoals` in `lib/goals.ts`, `goalTone` in `lib/progress.ts`
and the route-handler validation are the highest-value first targets, and none
of them needs a network call.

## Project structure

```
app/
  page.tsx                     Main (and only) page — owns log and goal state
  layout.tsx                   Root layout, font, metadata, theme colour
  globals.css                  Design tokens: the whole palette, light and dark
  api/analyze/text/route.ts    POST — estimate nutrition from a description
  api/analyze/image/route.ts   POST — estimate nutrition from a photo
components/
  AppHeader.tsx                Name, date, and a sticky day-progress meter
  DaySummary.tsx               Calories, macros, meal breakdown, goal editor
  Meter.tsx                    Every progress bar, at two sizes
  MacroRow.tsx                 One macro: label, bar, value against goal
  MealBreakdown.tsx            Per-meal calorie totals for the day
  GoalEditor.tsx               In-place form for the four daily targets
  AddFood.tsx                  Meal picker + three tabs
  MealPicker.tsx               Which meal the next entry lands in
  Tabs.tsx                     Tab strip with full keyboard support
  FoodSearch.tsx               Search input + capped, scrollable food grid
  FoodCard.tsx                 One catalogue food + Add button
  DescribeFood.tsx             Textarea → /api/analyze/text
  PhotoFood.tsx                File picker + preview → /api/analyze/image
  AnalysisResult.tsx           Shared confirmation checklist for both AI paths
  AnalysisSkeleton.tsx         Placeholder while the model works
  FoodLog.tsx                  Today's entries, grouped by meal
  MealSection.tsx              One meal heading + its entries + subtotal
  LogEntryCard.tsx             One logged entry + Remove
  DaySkeleton.tsx              Placeholder while the day loads
  Button.tsx                   Every button in the app
  Spinner.tsx                  Inline loading spinner
  ErrorNotice.tsx              Error box with optional retry
lib/
  types.ts                     Food / MealType / LogEntry / Goals / analysis
  foods.ts                     Static catalogue: 24 common foods
  meals.ts                     Meal order, labels, and time-of-day inference
  goals.ts                     Defaults, ranges, and shared validation
  progress.ts                  Goal-status thresholds (green / amber / red)
  format.ts                    Calorie, gram, and clock formatting
  today.ts                     The current date, formatted for display
  storage.ts                   localStorage: the log and the goals
  gemini.ts                    Gemini client, prompt, schema, validation
  useAnalysis.ts               Client hook for both AI routes
docs/                          Product, architecture, roadmap, decision logs
```

## Documentation

- [Product](docs/product.md) — what it does, who it is for, what is planned
- [Architecture](docs/architecture.md) — how it actually works
- [Roadmap](docs/roadmap.md) — completed, next, and future
- [PLAN.md](PLAN.md) — what was built, what was improved, where it goes next
- [CLAUDE.md](CLAUDE.md) — development conventions and constraints
- `docs/YYYY-MM-DD-*.md` — dated decision logs explaining past choices

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) for the full picture. Next up:

1. Deploy to Vercel — needs a hosted database, plus auth and rate limiting
2. Food history and charts — after fixing timezone-correct day scoping
3. User preferences — units, week start, an explicit timezone
4. Barcode scanning — needs a branded-food database and camera access
5. Adjustable serving quantities, and a test framework

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup,
branch naming, the verification gate, and pull request expectations.

Good first issues: adding the test framework, sharing the duplicated image
limits between client and server, or surfacing the silent failure in
`handleAdd`.

## Security

**Do not open a public issue for a security vulnerability.** See
[SECURITY.md](SECURITY.md) for how to report one.

Two things worth knowing before you deploy your own copy:

- **There is no rate limiting on `/api/analyze/*`.** Anyone who can load your
  instance can spend your Gemini quota. It is the first item on the roadmap.
- **Never commit `.env`.** It is gitignored; keep it that way. Your
  `GEMINI_API_KEY` is read only on the server and never reaches the browser.

## License

[MIT](LICENSE) © 2026 conceptwebworld26
