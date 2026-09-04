# Product

What Calorie Tracker is, who it is for, and what it does today.

Everything under **Current features** exists in the codebase right now.
Everything under **Planned capabilities** does not — it is intent, not
description. See `roadmap.md` for sequencing.

---

## Purpose

Logging food is tedious, and tedium is why people stop. Most trackers ask you
to find your exact meal in a database of hundreds of thousands of branded
entries, then confirm a portion, then confirm a serving unit. That is a lot of
friction for "I had chicken and rice."

Calorie Tracker keeps one screen and three ways in:

1. **Tap a common food** — fastest, for the things you eat constantly.
2. **Describe the meal in plain English** — for anything else.
3. **Photograph the plate** — for when describing it is more work than
   photographing it.

The last two use Gemini to estimate nutrition, so there is no food database to
search and no exact match to find. The trade-off is deliberate: an estimate you
actually record beats a precise figure you never enter.

## Target users

- **Someone tracking their own intake** for a fitness, weight, or health goal,
  who wants a running daily total without a subscription or an account.
- **People who abandoned mainstream trackers** because searching a branded food
  database for every meal is too slow.
- **Developers and self-hosters** who want a small, readable, local-first app
  they can run and modify themselves.

It is explicitly **not** built for dietitians, clinical use, multi-user
households, or anyone who needs verified nutrition data. Estimates are
estimates.

## Core functionality

The whole app is one page:

- A **sticky summary header** with today's calories and protein/carbs/fat
  totals, updating immediately as entries are added or removed.
- **Today's log** — every entry with its serving size and macros, each with a
  Remove button.
- **An "Add a food" panel** with three tabs, one per input method.

Data persists to a local SQLite file, so a refresh or a server restart does not
lose anything.

---

## Current features

### Food search (common foods)

- A built-in catalogue of **24 common foods** — staples like chicken breast,
  rice, eggs, banana, salmon, oats, tofu, quinoa (`lib/foods.ts`).
- A **search box filters the list live** by case-insensitive substring match on
  the food name.
- Each result is a card showing serving size, calories, and macros, with an Add
  button that logs exactly one serving.
- The catalogue is static data compiled into the app. It is not stored in the
  database and cannot currently be edited from the UI.

### Nutrition information

Every food — catalogue or AI-estimated — carries the same four macros plus a
serving size:

| Field | Meaning |
|-------|---------|
| `calories` | kcal for the stated portion |
| `protein` | grams |
| `carbs` | grams |
| `fat` | grams |
| `servingSize` | the portion the numbers describe, e.g. `100g`, `1 cup` |

Catalogue values are USDA-style reference figures. AI values are estimates for
the portion described or photographed.

### Meal and calorie tracking

- **Today only.** The log shows entries from the current day; there is no way
  to view or edit another date.
- **One serving per Add.** There is no quantity field.
- **Remove any entry** individually. Removal is optimistic — the row disappears
  at once, and the log refetches if the delete fails.
- **Entries are snapshots.** Each row stores a copy of the nutrition values at
  the moment it was logged, so changing the catalogue later never rewrites
  history.
- **Totals are derived** from the visible entries, so the header can never
  disagree with the list beneath it.

### AI-assisted nutrition estimation (Describe tab)

- Type a free-text description — "grilled chicken with rice and salad" — up to
  **500 characters**, with a live character counter.
- Gemini breaks the meal into **distinct foods**, one line item each. Composite
  dishes stay whole (lasagna is one item); separable ones are split (chicken /
  rice / salad).
- The result appears as a **checklist, not a log entry**. Every item starts
  checked; uncheck anything you did not eat.
- A **note** may explain the main assumption behind the estimate — usually a
  cooking method or an unstated portion size.
- A running total for the checked items sits next to the **"Add N to log"**
  button. **Nothing is written to the database until that button is pressed.**
- If the input is not food, the model returns no items and the UI says so
  instead of logging anything.

### Image-based food recognition (Photo tab)

- Take or upload a photo of a meal — **JPEG, PNG, WebP, or HEIC, up to 5MB**.
- Both limits are checked in the browser *and* re-checked on the server, so an
  obviously invalid file never costs an upload.
- A **preview of the photo** is shown while the analysis runs.
- Analysis starts automatically on selection; no separate submit press.
- The result flows into the **same confirmation checklist** as the Describe
  tab — identical component, identical rules, nothing logged without an
  explicit press.

### Error handling

- API failures are translated into plain language rather than surfaced as
  status codes: a missing API key explains how to set it, an upstream failure
  suggests trying again, a network failure says to check the connection.
- Failed analyses offer a **Retry** that re-sends the same input.
- Switching tabs mid-analysis does not lose it — panels stay mounted, so an
  in-flight lookup is still there when you come back.

### What the app deliberately does not have

Called out because their absence is a design choice, not an oversight:

- **No accounts, login, or authentication.** One user, one local database.
- **No cloud sync.** Data lives in `data/app.db` on the machine running it.
- **No editing after logging.** An entry can be removed, not amended.
- **No branded or restaurant foods**, no barcode scanning.
- **No goals, targets, streaks, or notifications.** It reports; it does not
  coach.

---

## Planned capabilities

None of the following exist yet. Ordering and rationale live in `roadmap.md`.

### Near term

- **Adjustable serving quantities** — log 2 eggs without pressing Add twice,
  and correct an AI portion estimate before accepting it. The single most
  requested-shaped gap in the current UX.
- **A date picker and history view** — see yesterday, and a running record over
  time. Requires fixing the timezone handling in the day-scoped query first.
- **Custom foods** — save a food you eat often into your own catalogue, rather
  than re-describing it to the AI every time.
- **Clear the whole day's log** in one action.

### Later

- **Distinguishing AI estimates from catalogue entries** in the log, so you can
  see at a glance which numbers are measured and which are guessed.
- **Caching identical lookups**, so describing the same meal twice does not
  cost two API calls.
- **Client-side image downscaling** instead of rejecting photos over 5MB
  outright — most phone photos exceed it.
- **Daily targets** — an optional calorie or protein goal, shown against the
  running total.
- **Data export** (CSV or JSON), so the log is not trapped in a SQLite file.

### Explicitly out of scope

Not planned, and a pull request adding one would need to argue its case first:

- Multi-user accounts, social features, or a hosted service.
- A full branded-food database or barcode scanning.
- Native mobile apps.
- Anything positioning the estimates as medical or clinical advice.
