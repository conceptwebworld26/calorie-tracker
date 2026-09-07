# 2026-09-07 — Browser storage for the portfolio deployment

Replacing SQLite with `localStorage` so the app runs on Vercel as a public,
account-free demo. Prompted by a production failure, not a preference.

---

## What was built

**`lib/storage.ts`** — the only module that touches `localStorage`, holding the
log and the goals under two versioned keys (`plate.log.v1`, `plate.goals.v1`).
It exposes `loadDay`, `readTodaysEntries`, `addEntry`, `removeEntry`,
`readGoals`, `writeGoals` and `isStorageAvailable`.

**Removed:** `lib/db.ts`, `lib/api.ts`, `app/api/log/`, `app/api/log/[id]/`,
`app/api/settings/`, and the `better-sqlite3` and `@types/better-sqlite3`
dependencies along with the `allowScripts` block they needed. The project now
has no native dependency at all.

**Kept unchanged:** `/api/analyze/text` and `/api/analyze/image`. They are the
only server code left, and they exist solely because `GEMINI_API_KEY` must not
reach the browser.

**Two bugs fixed on the way**, both of which only bite once the app is hosted.

---

## Why the deployment was failing

`lib/db.ts` opened the database at **module import time**:

```ts
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
```

On Vercel, `process.cwd()` is `/var/task`, which is read-only, so `mkdirSync`
threw `ENOENT`. Because that ran on import rather than inside a handler, *any*
route importing `db` failed before its own code ran — which is why `/api/log`
and `/api/settings` returned identical 500s.

Committing `data/app.db` would not have fixed it. The next line,
`db.pragma("journal_mode = WAL")`, writes to disk, as does every `INSERT` and
`DELETE`. A read-only filesystem defeats the whole layer, not just the `mkdir`.

Inspecting the database also turned up a detail that would have made "just ship
the file" quietly lossy: `app.db` was 4 KB while `app.db-wal` was 696 KB. The
database had never been checkpointed, so almost all of the data lived in the
write-ahead log.

---

## Technical choices and why

**`localStorage`, not a hosted database.** The brief rules out Supabase, MySQL,
and any external service. Beyond that constraint, a shared server-side store is
actively *wrong* for this deployment: with no accounts, one store means one log
shared by every visitor at once, each overwriting the last. Per-browser storage
gives every visitor their own, costs nothing, and needs no infrastructure.

**`/tmp` was considered and rejected.** Lambda's `/tmp` *is* writable, so
`better-sqlite3` could have stayed. But `/tmp` is per-instance and wiped between
cold starts, so the log would vanish unpredictably — which reads as a bug rather
than as a demo's known limitation. `localStorage` is the honest version of the
same constraint.

**The food catalogue needed no work.** `lib/foods.ts` was already a plain
TypeScript array compiled into the bundle, never stored in the database and
never written at runtime. The 24 foods and the whole search feature were
deployment-safe already; only the two runtime tables were ever at risk.

**Stored data is validated on read.** `isValidEntry` checks every field of every
row before it reaches the UI. `localStorage` is editable by the person browsing
and outlives app versions, so this is the same rule `isValidItem` applies to
model output, for the same reason: a bad row otherwise arrives as `NaN`.

**Reads never throw; writes deliberately do.** A blocked or corrupt store
degrades to an empty log rather than a blank page. But a failed *write* means
the entry did not persist, so it propagates — `app/page.tsx` catches it, sets
`storageBlocked`, and shows a banner. Private-mode browsing makes
`localStorage` present but throwing, so `isStorageAvailable()` probes with a
real write once on load, and the warning appears before the first Add rather
than after it silently does nothing.

**Keys are versioned rather than migrated.** `.v1` means an incompatible change
can bump the suffix and let the old key be ignored. Given the validator already
drops malformed rows, that is the entire migration story this build needs.

**Entries are kept for 30 days, not just today.** Pruning on write bounds
growth, while retaining enough history that the planned date picker is additive
rather than a new storage problem.

**`pendingId` was removed.** Writes are synchronous now, so a loading spinner on
the Add button would be a lie. `FoodCard`'s `AddState` went from
`idle | adding | added` to `idle | added`. The "Added" confirmation stays.

---

## The two bugs found while verifying

**1. The date was frozen at build time.** `/` is statically prerendered, and
`today` was computed in a `useState` initialiser — so `describeToday()` ran
during the build and its result was baked into the HTML. Worse,
`suppressHydrationWarning` on the date spans told React to *keep* the server's
text rather than correct it on hydration. Grepping the built output confirmed
it: `.next/server/app/index.html` contained a literal `Monday, 7 September`.

Deployed, every visitor would have seen the build date until the next deploy.
The date is now resolved after mount, inside the load effect, and the header
reserves width so its arrival does not shift the layout. `CLAUDE.md` gained a
standing rule: never derive a date or time during render.

**2. Day scoping used the wrong clock.** The old `GET /api/log` compared the
*server's* local midnight against UTC-stored timestamps — correct only while
host and reader shared a timezone, and on a UTC host, never. `isSameLocalDay`
now compares local date parts in the browser.

---

## Verification

`npx tsc --noEmit && npm run lint && npm run build` — all clean. Note that
`tsc` failed at first on stale generated route types in `.next/dev/types/`
referencing the deleted routes; deleting `.next/` fixed it, and `CLAUDE.md` now
says so.

Exercised in a real browser:

- Loads, food search filters, add, delete, totals, and goals all work; 150 + 105
  summed to 255 kcal and entries were filed under the selected meal.
- A reload preserves the log and the goals; both are visible in `localStorage`
  under the expected keys.
- Goals: saved, persisted across reload, and rejected out of range. Note the
  native `min`/`max` constraint fires before the JS check, so the browser's own
  message appears for out-of-range values and the custom message is reached only
  for an empty field. Both paths refuse to save.
- **Timezones:** the same stored entry read by browsers in `Pacific/Auckland`
  (UTC+12) and `Pacific/Midway` (UTC-11), with the clock frozen at a moment that
  is 7 September in one and 6 September in the other. Each showed its own date
  in the header and counted only its own local day, and an entry that was
  "tomorrow" in each zone was correctly excluded.
- Removed routes return 404; the two analyze routes still respond.
- **Real Gemini calls, not stubs.** Text: "two scrambled eggs and a slice of
  buttered toast" returned two items totalling 287 kcal, with the server-side
  total matching the sum. Image: a synthetic plate drawn on a canvas came back
  as "Fried Egg" and "Bacon", and the full UI path — preview, confirmation
  checklist, Add — wrote both entries to `localStorage` under Dinner.
- Image validation still rejects a wrong MIME type and a missing field with 400s.
- Zero console errors throughout.

**Key exposure checked against the built output**, not by inspection alone: the
literal key value appears 0 times in `.next/static`. Its one occurrence anywhere
in `.next` is the local Turbopack build cache, which is gitignored and never
served. No `NEXT_PUBLIC_` variable exists anywhere, and `lib/gemini.ts` is
imported only by the two route handlers.

---

## Known simplifications

- **The log is per-browser and per-device**, and clearing site data clears it.
  Stated in the footer rather than left to be discovered.
- **`logId` is a per-browser counter** (`max + 1`). Unique where it is used,
  meaningless anywhere else.
- **No rate limiting on `/api/analyze/*`.** The demo is public and
  unauthenticated, so anyone who loads it can spend the owner's Gemini quota.
  This is the one real exposure in the deployment and now the first item on the
  roadmap.
- **The existing 34 SQLite rows were not migrated.** They were test data from
  development, and there is no sensible destination for them in a per-visitor
  store. `data/` remains gitignored and is now simply unused.
- **Goals are global, not per-day**, so changing them re-colours today
  retroactively. Right for this build, wrong once history exists.
- **Still no tests.** The verification above was manual. `isValidEntry`,
  `isSameLocalDay` and `parseGoals` are pure and are named in `CLAUDE.md` as
  first targets when a framework lands.
