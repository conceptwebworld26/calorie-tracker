# Plan

Where **Plate** stands, what the professional-quality pass changed, and what
comes next. `docs/roadmap.md` is the detailed, prioritised backlog; this file is
the summary a person reads first.

**Live at <https://calorietracker.conceptwebworld.com>**

*Last updated: 2026-09-07.*

---

## What We Built

A single-page daily food log with no accounts and no database, running as a
public portfolio demo.

**Three ways to add food, one place they land.** Tap a common food from a
built-in catalogue of 24, describe a meal in plain English, or photograph the
plate. The last two send the input to Gemini and come back with a per-food
nutrition estimate. All three paths converge on the same `addEntry()`, so
everything persists identically.

**A confirmation step on every AI estimate.** Identified foods arrive as a
checklist with their own calorie and macro figures. Nothing is written to the
log until the Add button is pressed, and anything the model got wrong can be
unchecked first. The running selected total updates as you uncheck.

**A day measured against a goal.** The summary shows calories eaten, calories
left, and a progress bar that reads green under 75% of the goal, amber from 75%
to 100%, and red past it. Three macro bars show protein, carbs and fat against
their own targets. Goals are editable in place and persist across restarts.

**Meals, not one long list.** Every entry is filed under breakfast, lunch,
dinner or snack. The add panel picks the meal for you from the clock and lets
you change it. Today's log groups entries under meal headings with per-meal
calorie subtotals, and the summary carries a compact per-meal breakdown.

**Local-first, with no accounts.** The log and the goals live in the visitor's
own browser under two versioned `localStorage` keys. No login, no cloud, no
subscription, no database — open the URL and start logging. Entries are
denormalized snapshots, so editing the food catalogue later cannot rewrite
history.

**Safety rails on the model.** Requests use a `responseSchema` rather than free
text, the day's total is summed server-side and never taken from the model, and
every item is validated as fully numeric before it reaches the UI.

---

## What We Improved

The professional-quality pass, run as three review-and-fix cycles. The full
account is in `docs/2026-09-07-professional-redesign.md`.

**A real design system replaced ad-hoc utilities.** Every colour is now a
semantic token in `app/globals.css` (`bg-surface`, `text-ink-2`, `border-rule`,
`bg-good`) rather than a Tailwind palette class. Light and dark are two value
sets behind one set of names, which removed nearly every `dark:` variant in the
codebase. Saturation is reserved for goal status; macros use a separate cool
triad so the two never read as each other.

**Typography got a point of view.** One typeface — Archivo — worked across
weights 400 to 700, with tabular figures on globally because the interface is
numbers in columns. The day's calorie count is the single display moment.

**New features that the app needed to be a product.** A daily calorie goal with
a colour-coded progress bar. Macro breakdown bars. Meal categories with grouped
entries and subtotals. A header carrying the app name and today's date, with a
thin meter of the day's progress along its bottom edge that stays visible while
you scroll. Card-style entries throughout.

**The hierarchy was fixed twice.** The catalogue of 24 foods originally rendered
in full and pushed today's log 1,300 pixels down the page; it is now a capped,
scrollable pane. The summary rail gained a per-meal breakdown so it earns its
column instead of floating alone. When an AI result is on screen, the lookup
button demotes to secondary so there are not two competing primary actions.

**Real defects were found and fixed, not just styling.** A hydration mismatch on
the locale-formatted date. Three React Compiler lint errors from calling
`setState` synchronously inside effects. Food names truncating mid-word because
the Add button had a fixed width. A `role="tablist"` with no keyboard support at
all — arrow keys, Home and End now work with a roving `tabIndex`.

**States that were missing now exist.** A skeleton that mirrors the real layout
while the day loads. A skeleton sized to the answer while the model works. An
empty log that tells a first-time user what to do next. A load failure with a
retry. Per-button "Added" confirmation so adding several things in a row does
not feel like nothing happened.

**Verified, not assumed.** Every state was exercised in a real browser at 1440,
1280, 1100 and 390 pixels wide, in both colour schemes: goal under, near and
over; empty and populated; loading, error and confirmation. The AI routes were
stubbed at the network layer, so none of this cost Gemini quota.

---

## Future Roadmap

Sequenced. Each item is expanded in `docs/roadmap.md`.

**1. Rate-limit `/api/analyze/*`.** The one real exposure in the deployment.
The demo is public and unauthenticated, so anyone who loads the page can spend
the owner's Gemini quota, and a script can do it in bulk. No database needed for
a useful first cut: an in-memory counter keyed by IP, or edge middleware.
Neither survives a cold start, which is fine — it raises the cost of abuse from
zero to inconvenient.

**2. Food history and charts.** Now additive rather than blocked. Storage
already keeps 30 days and scopes "today" by the visitor's own calendar day, so
the two things that used to stand in the way — the timezone bug and the lack of
retained history — are already handled. Needs a date picker, a past-days view,
and weekly calorie and macro trends.

**3. User preferences.** Goals already live in `plate.goals.v1` behind a
validated read/write. Extending it covers units (metric or imperial) and which
day the week starts on.

**4. Barcode scanning.** Previously listed as *Not planned*; it is now a stated
direction, and that reversal is deliberate. It needs a real branded-food
database — Open Food Facts is the obvious candidate — plus camera access and a
scanning library. It is the largest item here and should not start before the
three above.

**Also worth doing, smaller:** adjustable serving quantities (the largest
remaining usability gap — two eggs currently means pressing Add twice); a test
framework, as its own change; clearing a whole day in one press; custom saved
foods; a `source` field so AI and catalogue entries are distinguishable once
logged; data export, which matters more now that a log lives in one browser;
and caching identical AI lookups, which are billed twice today.

**Deliberately left to the commercial version:** accounts, per-user data
scoping, cross-device sync, and the hosted database all three imply. None of it
belongs in this build — the demo is account-free by design, and adding any one
piece pulls in the rest.

**Still not planned:** social features, native mobile apps, or any framing of
these estimates as medical or dietetic advice.
