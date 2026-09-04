# 2026-09-03 — Wiring the AI lookup routes into the UI

Follow-on to `2026-09-03-gemini-nutrition-lookup.md`, which built the
`/api/analyze/*` routes but left the frontend untouched.

## What was built

"Add a food" is now a three-tab panel. All three paths end at the same place —
`POST /api/log` — so everything persists in SQLite exactly as before.

- **Common foods** — the original catalog search and one-click Add, unchanged.
- **Describe** — a textarea, a character counter, and a "Look up nutrition"
  button that calls `POST /api/analyze/text`.
- **Photo** — a file picker that previews the chosen image and calls
  `POST /api/analyze/image`.

New components: `AddFood` (tabs), `DescribeFood`, `PhotoFood`, `AnalysisResult`
(the shared confirmation step), `Spinner`, `ErrorNotice`. New client hook:
`lib/useAnalysis.ts`. `app/page.tsx` gained `handleAddMany`; `FoodSearch` lost
its `<h2>` to the tab container and is otherwise untouched.

## Technical choices and why

**Both AI paths share one confirmation step (`AnalysisResult`).**
The brief asked for confirmation on photo uploads specifically, but the text
route returns multiple items too ("chicken with rice and salad" → three foods).
Giving both paths the same checkbox list means one component to reason about,
and it avoids a confusing split where one AI path asks before logging and the
other doesn't. Items start checked, since the common case is that the estimate
is right; the running total updates as boxes are unchecked, so the effect of a
correction is visible before committing.

**Nothing AI-generated reaches the database without an explicit press.**
These are estimates, and a wrong one silently entering the log is worse than an
extra click. `AnalysisResult` holds the result in component state; only its
"Add N to log" button calls the API.

**`handleAddMany` POSTs sequentially, not in parallel.**
`GET /api/log` orders by `logged_at`, and parallel POSTs would land in the same
millisecond in arbitrary order — so the log wouldn't match the order the user
just confirmed. Sequential requests keep those consistent. Counts here are
single digits, so the latency cost is irrelevant. On a mid-sequence failure the
already-saved entries are kept in state and the error is surfaced, rather than
discarding work that is already in the database.

**No batch endpoint was added.**
Logging three foods is three `POST /api/log` calls. A `POST /api/log/batch`
would be faster in principle, but it would duplicate validation and transaction
handling for a saving of a few hundred milliseconds on an action taken a few
times a day. The existing single-entry route was left as the only writer.

**One `useAnalysis` hook shared by both panels.**
Loading, error, result, and reset behave identically for text and photo; only
the request body differs. The hook also carries a request-id guard so a slow
first lookup can't overwrite the result of a newer one — easy to hit by editing
a description and re-submitting before the first response lands.

**Errors are translated, not passed through.**
`friendlyError` maps status codes to plain language: a 502 becomes "The AI
couldn't work that out just now", a missing key becomes a setup instruction,
a network failure becomes a connection message. The API's own 400s *are* shown
verbatim, because those are specific and actionable ("Image must be 5MB or
smaller"). Raw upstream text — the Gemini SDK's 404 dump, for instance — never
reaches the user. Every error renders in a `role="alert"` box with a retry
button where retrying makes sense.

**The photo panel validates type and size before uploading.**
The server checks both anyway, but a 6MB file shouldn't have to cross the wire
to be told no. The client limits mirror `lib/gemini.ts`, exported from
`useAnalysis.ts` so the two can't drift silently.

**The preview URL is created at pick time, stored beside the file.**
An earlier version derived it in a `useEffect`, which trips React's
`set-state-in-effect` lint rule and causes a cascading render. Keeping
`{ file, url }` in one state value means `URL.createObjectURL` runs once per
pick, and the effect only revokes — so every URL is released exactly once, on
replacement or unmount.

**Tab panels stay mounted and are hidden with `hidden`.**
Unmounting would discard an in-flight analysis or a typed description whenever
the user glanced at another tab. Being real `role="tabpanel"` elements also
keeps the tab semantics correct for screen readers.

**`<img>` rather than `next/image` for the preview.**
The source is a `blob:` URL for a local file; `next/image` needs a static import
or a configured remote pattern, and its optimization pipeline has nothing to do
for an object URL. The lint rule is disabled on that one line with a reason.

## Note on AI item ids

Ids are generated per analysis, so `ai-1` recurs across separate lookups and
`food_id` is not unique in `log_entries`. This is harmless — `log_id` is the
primary key and entries are denormalized copies — but it does mean `food_id`
can't be used to group or de-duplicate AI entries. A `source` column would be
the fix if that's ever needed.

## Verification

Driven in a real browser (Playwright) against the live Gemini API, plus `curl`
against the database:

| Case | Result |
|---|---|
| Quick-add still works after refactor | Banana logged, id `banana` |
| Describe → "oatmeal with blueberries and a black coffee" | 3 foods, note, total 210 kcal |
| Unchecking an item | Total 210 → 208, button "Add 3" → "Add 2" |
| Adding text results | 2 rows in DB; unchecked coffee absent |
| Photo → 3.1MB meal photo | Preview rendered, 4 foods, total 429 kcal (sums correctly) |
| Adding photo results | 4 rows in DB, order preserved |
| Loading states | Spinner on button + status line, both routes |
| Non-image upload | "That file isn't a supported image…", rejected client-side |
| Forced upstream failure (bad model id) | "The AI couldn't work that out just now." + Try again; raw 404 not leaked |
| Persistence | 7 entries, 742 kcal, survived a full dev-server restart |
| Browser console | No errors or warnings |

`npx tsc --noEmit` and `npx eslint app components lib` both pass. Test entries
and screenshots created during verification were deleted afterwards.

## Known simplifications (not built)

- **No tests.** Still no test framework in the repo; verification was manual.
- **Analysis state is lost on tab switch away and page reload** — panels stay
  mounted, but nothing is persisted, so a refresh mid-confirmation loses the
  result.
- **No editing of AI estimates.** Items can be included or excluded, not
  adjusted — if Gemini says 150g and it was 200g, there's no way to change it.
- **No quantity multiplier**, consistent with the catalog path.
- **AI entries are indistinguishable from catalog entries once logged** (no
  `source` column), so the log can't show which numbers are estimates.
- **No image downscaling.** Photos over 5MB are rejected rather than resized.
