# Roadmap

Where the project is and what comes next. Items move up this file as they land;
each section is ordered by priority within itself.

*Last reviewed: 2026-09-04.*

---

## Completed

### Core tracking — `docs/2026-08-14-initial-build.md`

- [x] Single-page app with a sticky summary header (calories + macros)
- [x] Static catalogue of 24 common foods with USDA-style values
- [x] Live search filtering the catalogue by name
- [x] Add a food to today's log with one press
- [x] Today's log with per-entry remove, optimistic and self-correcting
- [x] SQLite persistence via `better-sqlite3`, surviving refresh and restart
- [x] Denormalized log entries, so catalogue edits cannot rewrite history
- [x] `GET`/`POST /api/log` and `DELETE /api/log/[id]`
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

### Repository and documentation

- [x] Public GitHub repository
- [x] Dated decision logs for every non-obvious choice so far
- [x] Standing product, architecture, and roadmap docs
- [x] `CLAUDE.md` as the persistent development contract
- [x] README, LICENSE (MIT), CONTRIBUTING, SECURITY, `.env.example`
- [x] `.gitignore` covering secrets, build output, and the runtime database

---

## In progress

Nothing. The last feature work (the AI add-food UI) is complete, and the
documentation pass above is the most recent change.

---

## Next

The MVP is functionally complete for its stated purpose. This section is the
short list that makes it *good* rather than bigger — every item closes a gap a
real daily user hits, and none of them expand the product's scope.

### 1. Adjustable serving quantities

The largest usability gap. Every Add logs exactly one serving, so two eggs means
pressing Add twice, and an AI portion estimate can be accepted or dropped but
never corrected.

Needs a quantity control on `FoodCard` and on each row of `AnalysisResult`, with
macros scaled before the POST. No schema change — the scaled values are simply
what gets stored.

### 2. A test framework

There is none, and everything below this line gets riskier without it. Vitest is
the natural fit. The first targets need no network and no browser:
`sumTotals` and `isValidItem` in `lib/gemini.ts`, plus the request validation in
all four route handlers.

Should land as its own change, not bundled into a feature.

### 3. Fix day scoping, then add history

`GET /api/log` compares the server's local midnight against UTC-stored
timestamps. That is correct only while server and user share a timezone, and it
is the blocking bug beneath any date feature.

Fix it first, then add a date picker and a past-days view. This also earns the
first index on `logged_at`.

### 4. Clear the whole day

A one-press reset with a confirmation step. Small, self-contained, and the
obvious complement to per-entry removal.

### 5. Custom foods

Let a user save a food they eat often into their own catalogue, instead of
re-describing it to the AI daily. Introduces the first genuinely new table, and
so the first real need for a migration story in `lib/db.ts`.

---

## Future

Worth doing eventually; none are blocking, and none should jump the queue above.

**Product**

- **A `source` column on `log_entries`**, so AI estimates and catalogue foods
  are distinguishable once logged — currently they are not.
- **Editing a logged entry**, rather than removing and re-adding it.
- **Optional daily targets** for calories or protein, shown against the running
  total. Reporting only — no coaching, no streaks.
- **Data export** to CSV or JSON, so the log is not trapped in a SQLite file.

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
- **A migration story for `lib/db.ts`.** `CREATE TABLE IF NOT EXISTS` at import
  time cannot alter an existing database; the first added column will need one.
- **Surface silent failures.** `handleAdd` in `app/page.tsx` swallows a failed
  POST — the food simply never appears.

**Only if the project is ever hosted** — these are a bundle, not a menu, and
none of them make sense to add individually to a local tool:

- Authentication and per-user data scoping.
- Rate limiting on `/api/analyze/*`, so a public instance cannot drain the
  owner's Gemini quota.
- Range and length validation on `POST /api/log`.
- A hosted-database story — `better-sqlite3` is synchronous, file-based, and a
  poor fit for a serverless deployment.

---

## Not planned

Deliberately out of scope. A pull request adding one of these needs to make its
case before implementation, not after:

- Multi-user accounts, sharing, or social features
- A full branded-food or restaurant database, or barcode scanning
- Native mobile applications
- Any framing of the estimates as medical, clinical, or dietetic advice
