# 2026-09-07 — Professional-quality redesign

Turning a working prototype into something that reads as a product. Run as a
Ralph Loop: build, review the result against the brief, fix what the review
found, repeat. Three cycles, each closed by a design review of the running app
in a real browser rather than of the diff.

---

## What was built

**A design token system.** `app/globals.css` now holds the entire visual
language as CSS variables, exposed through Tailwind v4's `@theme inline` as
semantic utilities: `bg-surface`, `text-ink-2`, `border-rule`, `bg-good`,
`bg-protein`. Light and dark are two value sets behind one set of names.

**Daily goals.** A new `settings` table (key/value) and `GET`/`PUT
/api/settings`. Goals cover calories, protein, carbs and fat, are editable in
place from the summary card, and are validated on both sides of the wire by the
same `parseGoals` in `lib/goals.ts`.

**Goal progress with state colour.** One wide calorie bar plus three macro bars.
`goalTone` in `lib/progress.ts` returns `good` below 75% of the goal, `warn`
from 75% to 100%, and `over` past it.

**Meal categories.** A `meal` column on `log_entries`, a `MealType` union, and a
meal picker in the add panel that defaults to whichever meal it currently is.
Today's log groups entries under meal headings with per-meal subtotals, and the
summary carries a compact per-meal breakdown.

**A header.** App name, today's date, and a thin meter of the day's progress
along the bottom edge — the reason the header is sticky, since the summary card
scrolls away but the day's standing should not.

**Card-style entries**, a two-column desktop layout with a sticky summary rail,
and shared primitives: `Button`, `Meter`, `Tabs`, `Spinner`.

**States that were missing.** `DaySkeleton` mirrors the real layout while the
day loads; `AnalysisSkeleton` is sized to the answer while the model works; an
empty log tells a first-time user what to do; a load failure offers a retry; and
each catalogue button shows a brief "Added" confirmation.

---

## Technical choices and why

**Tokens instead of `dark:` variants.** The previous code carried a `dark:`
counterpart on nearly every colour utility, which doubled the surface area of
every styling change and made it easy to forget one. Swapping variable *values*
under `prefers-color-scheme` and naming *roles* in components means dark mode is
correct by construction. The cost is that a colour cannot be chosen ad hoc — it
has to be added to the token block first, which is the point.

**Saturation reserved for goal status.** The brief asks for a green/amber/red
progress bar *and* a macro visual. If macros used warm hues too, a glance at the
card would not distinguish "you are over your calories" from "carbs are high".
Macros therefore use a cool triad — teal, indigo, plum — and `--good`/`--warn`/
`--over` are the only saturated colours in the interface.

**One bar family, no ring.** An early draft had a progress ring for calories and
bars for macros. Two visual metaphors for the same idea is one too many; the
ring went, leaving one wide bar and three slim ones that read as a set.

**The catalogue is a capped scroll pane.** Rendering all 24 foods pushed today's
log 1,300 pixels down the page — the log is the point of the app, and it was
below the fold. Capping the grid at `max-h-80` inside a bordered pane puts the
log back above the fold without hiding anything.

**Per-entry macros on log rows, not per-entry macro bars.** The row had enough
width to carry `P / C / F` figures, which fills it with information rather than
whitespace. They are hidden below the `sm` breakpoint, where the name and the
calorie count are all that fits.

**The meal breakdown has no bars.** It was drafted with them, which put eight
bars in one card and turned a summary into a chart. Plain rows carry the same
information and let the calorie bar stay the loudest thing on the card.

**`describeToday()` in a `useState` initialiser, not an effect.** The date is
needed on the first paint, and the React Compiler lint rules reject calling
`setState` synchronously inside `useEffect`. The server and the browser can
format a locale date differently, so the two date spans carry
`suppressHydrationWarning`; the state React keeps after hydration is always the
browser's. The initial fetch takes the other permitted shape — an async IIFE
inside the effect, setting state only after an `await`.

**An `ALTER TABLE` guard for the `meal` column.** `lib/db.ts` runs
`CREATE TABLE IF NOT EXISTS` at import time, so editing that statement would
only have reached databases that did not exist yet. The guard reads
`PRAGMA table_info` and adds the column when it is missing. Rows logged before
meals existed default to `snack`, which is the honest answer: we do not know
which meal they were.

**An unspecified meal on `POST /api/log` is inferred, not rejected.** A direct
POST or an older client still lands somewhere sensible.

**A `Tabs` component with real keyboard support.** `role="tablist"` is a promise
about arrow keys, Home and End. The previous markup declared the role and
delivered none of it. `Tabs.tsx` implements a roving `tabIndex` where selection
follows focus.

**Reversal noted:** `docs/roadmap.md` previously listed daily targets under
*Future* and barcode scanning under *Not planned*. Targets are now built;
barcode scanning has been moved to *Next* at the project owner's direction. Both
files have been updated rather than left to contradict the code.

---

## What the review found

Each cycle ended by loading the running app and reading it as a stranger would.

**Cycle 1 — hierarchy and correctness.** The catalogue dominated the page and
pushed today's log far below the fold. The sticky summary rail was a short card
against a very tall right column, so the layout read lopsided. Food names
truncated mid-word ("White Rice (cook…") because the Add button had a fixed
96-pixel width. The console showed a hydration mismatch on the date. Three
React Compiler lint errors were failing `npm run lint` on `setState` inside
effects. Twenty-four solid black Add buttons made the catalogue shout.

**Cycle 2 — density and cues.** The rail's new meal breakdown used bars, putting
eight bars in one card. The capped catalogue clipped a card mid-height with
nothing to say it scrolled. Log entry rows were sparse — a name on the left and
a number on the right across 600 pixels. The header meter was heavy enough to
read as a stuck loading bar.

**Cycle 3 — interaction and access.** With an AI result on screen, "Look up
nutrition" and "Add 3 to log" were both solid dark buttons competing for the
same attention. The tab strip had no keyboard support despite its role.

Each of these was fixed before the next cycle began.

---

## Verification

`npx tsc --noEmit && npm run lint && npm run build` — all clean.

Exercised in a real browser (Playwright) at 1440, 1280, 1100 and 390 pixels
wide, in both colour schemes:

- Goal under (green), near (amber, goal 1,100) and over (red, goal 800).
- Empty log, populated log across all four meals, and the loading skeleton.
- Goal editor: open, edit, save, cancel; out-of-range values rejected with a
  message naming the field and its bounds.
- AI confirmation: three items found, unchecking one dims the row, drops the
  selected total from 381 to 261 kcal and relabels the button to "Add 2 to log".
- AI failure: a 502 renders the translated message with a retry.
- Keyboard: arrow keys move and select tabs, End jumps to the last, selection
  wraps, `tabIndex` is `[0, -1, -1]`, meal chips respond to arrows as radios,
  and the focus ring is visible.
- Horizontal overflow checked programmatically at 390px — `scrollWidth` equals
  `clientWidth`, no element extends past the viewport.
- Zero console errors on load and through the full add-and-remove flow.

**The AI routes were stubbed at the network layer for all of this**, so the
confirmation and failure paths were verified without spending Gemini quota.

Seed data used for the screenshots was deleted afterwards and the goals reset to
their defaults; the database was left as it was found.

---

## Known simplifications

- **The day-scoping bug is untouched.** `GET /api/log` still compares the
  server's local midnight against UTC timestamps. It is correct for local
  single-user use and is the blocking defect beneath any history feature — it
  belongs to that change, not this one.
- **A logged entry's meal cannot be changed.** Wrong meal means remove and
  re-add. The picker is set before adding, which covers the common case.
- **Still one serving per Add**, and still no quantity control anywhere.
- **Goals are global, not per-day.** Changing them re-colours today
  retroactively, which is the right behaviour for a single-user tool and would
  not be once history exists.
- **No `aria-live` on the running total.** The per-button "Added" state is the
  confirmation a screen reader gets; a polite live region on the day's total
  would be better and was left out to avoid announcing on every keystroke.
- **The empty-day breakdown shows four "none yet" rows.** Slightly redundant,
  but it teaches the four meal categories to a first-time user.
- **Still no tests.** The verification above was manual. `parseGoals` and
  `goalTone` are pure and are named in `CLAUDE.md` as first targets when a
  framework lands.
