# 2026-08-14 — Initial build

## What was built

A working single-page calorie tracker:

- Next.js (App Router) + TypeScript + Tailwind CSS, scaffolded with `create-next-app`.
- A static catalog of 24 common foods (`lib/foods.ts`) with calories, protein, carbs, fat, and serving size.
- A client-side search bar that filters the catalog by name.
- A food log backed by SQLite (`better-sqlite3`), with API routes for adding, listing, and removing entries.
- A sticky summary header showing today's total calories, protein, carbs, and fat, computed from the currently loaded log entries.
- `npm run dev` starts the app at `localhost:3000`; the SQLite file is created automatically at `data/app.db`.

## Technical choices and why

**SQLite (`better-sqlite3`) instead of localStorage.**
The brief asked for a "local database" that persists across refreshes. localStorage would satisfy "persists," but it's browser-tied, string-only, and not really a database. SQLite via `better-sqlite3` is a real embedded database, requires no external service (no Postgres/Docker), and needs no ORM/migration step — `lib/db.ts` opens the file and runs `CREATE TABLE IF NOT EXISTS` on first import. It ships prebuilt native binaries (a `win32-x64.node` prebuild was used here), so no local build toolchain was needed. It's accessed only from API routes, never from the browser.

**Static food catalog instead of a `foods` DB table.**
The 20+ common foods are fixed reference data — they don't change at runtime and there's no UI for editing them. Putting them in a DB table would add a schema, a seed script, and a fetch round-trip for no benefit. A plain TypeScript array in `lib/foods.ts` is simpler, is filtered client-side for instant search, and is fully type-checked.

**Denormalized log entries.**
Each `log_entries` row stores a copy of the food's calories/protein/carbs/fat/serving size at the moment it was logged, rather than a foreign key to the food catalog. If the catalog is edited later (e.g. correcting a calorie count), past log entries stay accurate to what was actually recorded — matching how a real food diary behaves.

**Day-scoped log.**
The brief describes a "daily food log," so `GET /api/log` filters to entries from the current local day (`logged_at >= start of today`) rather than returning the entire all-time history. This was the simplest interpretation that matches the requested UI (one running total, no date navigation).

**No auth, no framework state library.**
Per the brief, there are no accounts. The app is one page with a handful of components, so `useState`/`useEffect` in `app/page.tsx` is enough — no Redux/Zustand/React Query was introduced.

## Known simplifications (not built)

- No history/date view — the log only ever shows "today."
- No quantity/serving multiplier — each "Add" logs exactly one serving.
- No way to add a custom food to the catalog from the UI.
- No automated tests were written for this initial build.

These are called out in `CLAUDE.md` under "What's next" as candidate follow-ups, not implemented here since they weren't requested.
