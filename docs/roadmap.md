# Roadmap

Where the project is and what comes next. Items move up this file as they land;
each section is ordered by priority within itself.

*Last reviewed: 2026-09-07 (portfolio deployment).*

---

## Completed

### Core tracking — `docs/2026-08-14-initial-build.md`

- [x] Single-page app with a sticky summary header (calories + macros)
- [x] Static catalogue of 24 common foods with USDA-style values
- [x] Live search filtering the catalogue by name
- [x] Add a food to today's log with one press
- [x] Today's log with per-entry remove, optimistic and self-correcting
- [x] ~~SQLite persistence via `better-sqlite3`~~ — superseded by browser
      storage on 2026-09-07, see below
- [x] Denormalized log entries, so catalogue edits cannot rewrite history
- [x] ~~`GET`/`POST /api/log` and `DELETE /api/log/[id]`~~ — removed with the
      SQLite layer
- [x] Dark mode throughout

### AI nutrition lookup — `docs/2026-09-03-gemini-nutrition-lookup.md`

- [x] `POST /api/analyze/text` — estimate nutrition from a description
- [x] `POST /api/analyze/image` — estimate nutrition from a photo
- [x] One shared `analyzeNutrition()` path for both routes
- [x] Structured JSON output via `responseSchema` — no fence parsing
- [x] Totals summed server-side, never taken from the model
- [x] Per-item numeric validation, so a bad item cannot reach the UI as `NaN`
- [x] Typed `GeminiError` mapping failures to real HTTP statuses
- [x] Input limits enforced server-side: 500 chars, 5MB, image type allow-list

### AI add-food UI — `docs/2026-09-03-ai-add-food-ui.md`

- [x] Three-tab add panel: Common foods / Describe / Photo
- [x] Shared confirmation checklist for both AI paths
- [x] Nothing logged without an explicit press
- [x] Photo preview via object URL, revoked exactly once
- [x] Friendly error translation with retry
- [x] Stale-response guarding, so a slow request cannot overwrite a newer one
- [x] Tab panels stay mounted, preserving an in-flight analysis

### Goals, meals, and the design system — `docs/2026-09-07-professional-redesign.md`

- [x] Design token system in `app/globals.css`, surfaced as semantic Tailwind
      utilities; light and dark as two value sets behind one set of names
- [x] Daily calorie and macro goals, editable in place and persisted
- [x] ~~`settings` table and `GET`/`PUT /api/settings`~~ — replaced by
      `plate.goals.v1`, still validated by `parseGoals`
- [x] Colour-coded calorie progress bar: green, amber past 75%, red past 100%
- [x] Macro bars for protein, carbs and fat, in a palette distinct from status
- [x] Meal categories on every entry
- [x] Meal picker defaulting to the current time of day
- [x] Log grouped by meal with per-meal calorie subtotals
- [x] Per-meal calorie breakdown in the summary
- [x] Header with the app name, today's date, and a sticky day-progress meter
- [x] Card-style food and log entries; two-column desktop layout with a sticky
      summary rail
- [x] Shared primitives: `Button`, `Meter`, `Tabs`, `Spinner`
- [x] Loading skeletons for the day and for an in-flight analysis
- [x] Empty-log and load-failure states, and per-button "Added" confirmation
- [x] Keyboard support for the tab strip (arrows, Home, End, roving `tabIndex`)
- [x] Fixed: hydration mismatch on the locale-formatted date
- [x] Fixed: three React Compiler lint errors from `setState` inside effects

### Portfolio deployment — `docs/2026-09-07-browser-storage.md`

The app is live at <https://calorietracker.conceptwebworld.com>.

- [x] Replaced SQLite with `localStorage` behind `lib/storage.ts`
- [x] Removed `better-sqlite3`, `lib/db.ts`, `lib/api.ts`, and the `/api/log`,
      `/api/log/[id]` and `/api/settings` routes
- [x] No native dependencies left — `npm ci` needs no build toolchain
- [x] Versioned storage keys (`plate.log.v1`, `plate.goals.v1`) with validation
      on read, since stored data is user-editable and outlives app versions
- [x] Fixed day scoping: "today" is now the visitor's own calendar day
- [x] Fixed the date being frozen at build time by the static prerender
- [x] A banner when the browser blocks site storage, and a footer note that the
      log is per-browser
- [x] Deployed on Vercel, with `GEMINI_API_KEY` verified absent from the bundle

### Repository and documentation

- [x] Public GitHub repository
- [x] Dated decision logs for every non-obvious choice so far
- [x] Standing product, architecture, and roadmap docs
- [x] `CLAUDE.md` as the persistent development contract
- [x] README, LICENSE (MIT), CONTRIBUTING, SECURITY, `.env.example`
- [x] `.gitignore` covering secrets, build output, and the runtime database
- [x] `PLAN.md` — what was built, what was improved, and where it goes next

---

## In progress

Nothing. The portfolio deployment above is the most recent change.

---

## Next

The app is functionally complete for its stated purpose. Items 1 to 4 are the
project owner's stated direction; the rest close gaps a daily user hits.

### 1. Rate-limit `/api/analyze/*`

**The one real exposure in the current deployment.** The demo is public and
unauthenticated, so anyone who loads the page can spend the owner's Gemini
quota, and a script can do it in bulk.

No database is needed for a useful first cut: an in-memory counter keyed by IP
in the route handler, or Vercel's own edge middleware. Neither survives a cold
start, which is fine — it raises the cost of abuse from zero to inconvenient.

### 2. Food history and charts

Now additive rather than blocked. `lib/storage.ts` already keeps 30 days and
scopes "today" by the visitor's local calendar day, so the two things that used
to stand in the way — the timezone bug and the lack of retained history — are
already handled.

Needs a date picker, a past-days view, and weekly calorie and macro trends.

### 3. User preferences

Goals already live in `plate.goals.v1` behind a validated read/write. Extending
it covers units (metric or imperial) and which day the week starts on.

### 4. Barcode scanning

**Previously listed under *Not planned*.** It is now a stated direction at the
project owner's request, and this entry records the reversal rather than leaving
the two sections to contradict each other.

It needs a real branded-food database — Open Food Facts is the obvious candidate
— plus camera access and a scanning library. It is the largest item on this
list, it reopens the "no branded-food database" decision from the initial build,
and it should not start before the three above.

### 5. Adjustable serving quantities

The largest usability gap. Every Add logs exactly one serving, so two eggs means
pressing Add twice, and an AI portion estimate can be accepted or dropped but
never corrected.

Needs a quantity control on `FoodCard` and on each row of `AnalysisResult`, with
macros scaled before the POST. No schema change — the scaled values are simply
what gets stored.

### 6. A test framework

There is none, and everything above this line gets riskier without it. Vitest is
the natural fit. The first targets need no network and no browser: `sumTotals`
and `isValidItem` in `lib/gemini.ts`, `parseGoals` in `lib/goals.ts`, `goalTone`
in `lib/progress.ts`, and the request validation in all five route handlers.

Should land as its own change, not bundled into a feature.

### 7. Clear the whole day

A one-press reset with a confirmation step. Small, self-contained, and the
obvious complement to per-entry removal.

### 8. Custom foods

Let a user save a food they eat often into their own catalogue, instead of
re-describing it to the AI daily. Introduces the first genuinely new stored
collection, and so the first real need for a versioning story in
`lib/storage.ts`.

---

## Future

Worth doing eventually; none are blocking, and none should jump the queue above.

**Product**

- **A `source` column on `log_entries`**, so AI estimates and catalogue foods
  are distinguishable once logged — currently they are not.
- **Editing a logged entry**, rather than removing and re-adding it — including
  moving it to a different meal, which today means removing and re-adding.
- **Data export** to CSV or JSON, so the log is not trapped in one browser —
  more valuable now that it is per-device.

**AI and performance**

- **Cache identical lookups.** Every analysis is a live API call today;
  describing the same meal twice costs twice.
- **Client-side image downscaling** instead of rejecting photos over 5MB. Most
  phone photos exceed the limit, and resizing is strictly better than refusing.
- **Share the input limits.** `MAX_IMAGE_BYTES` and the type allow-list are
  declared separately in `app/api/analyze/image/route.ts` and
  `lib/useAnalysis.ts`, and can drift.
- **Stream or progressively render** analysis results, so a slow lookup shows
  something sooner.

**Engineering**

- **CI on pull requests** — typecheck, lint, build, and tests once they exist.
- **A migration story for stored data.** Bumping the key suffix drops old data
  rather than upgrading it; a real migration would carry it forward.
- **Surface silent failures.** `handleAdd` in `app/page.tsx` swallows a failed
  POST — the food simply never appears.

**Accessibility and polish**

- **A polite `aria-live` region on the day's running total**, so a screen reader
  hears the total change. The per-button "Added" state is the only confirmation
  today.
- **Per-day goals**, so changing a target does not re-colour past days. Harmless
  now; wrong the moment history exists.

**For the commercial version, designed separately:** accounts, per-user data
scoping, cross-device sync, and the hosted database that all three imply. None
of it belongs in this build — the demo is deliberately account-free, and adding
any one piece would pull in the rest.

---

## Not planned

Deliberately out of scope. A pull request adding one of these needs to make its
case before implementation, not after:

- Multi-user accounts, sharing, or social features
- Native mobile applications
- Any framing of the estimates as medical, clinical, or dietetic advice
