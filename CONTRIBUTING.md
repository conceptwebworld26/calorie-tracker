# Contributing

Thanks for your interest in Calorie Tracker. This is a small, deliberately
simple project — contributions that keep it that way are the most welcome.

## Before you start

For anything beyond a bug fix or a typo, **open an issue first**. The project
has a clear scope (see [docs/product.md](docs/product.md) and
[docs/roadmap.md](docs/roadmap.md)), and it is better to agree an approach
before you write code than to have a finished pull request turned down.

Things explicitly out of scope: multi-user accounts, a branded-food database,
barcode scanning, native mobile apps, and anything framing the estimates as
medical advice.

## Local setup

**Requirements:** Node.js 20+ and npm. `better-sqlite3` compiles natively on
install, so you need your platform's build tools — Xcode Command Line Tools on
macOS, `build-essential` on Linux, Visual Studio Build Tools on Windows.

```bash
git clone https://github.com/conceptwebworld26/calorie-tracker.git
cd calorie-tracker
npm install
cp .env.example .env
npm run dev
```

Open <http://localhost:3000>. The SQLite database is created automatically at
`data/app.db` on first run.

To work on the AI features you need a `GEMINI_API_KEY` in `.env` — get one from
[Google AI Studio](https://aistudio.google.com/apikey). Everything except the
Describe and Photo tabs works without it. **Never commit your `.env`.**

## Branching

Work on a branch off `main`, named for what it does:

```
feat/serving-quantities
fix/timezone-day-scoping
docs/update-roadmap
chore/add-vitest
```

`main` is protected in practice: no force-pushing, and no rewriting history that
has been pushed.

## Development expectations

The full set of conventions lives in [CLAUDE.md](CLAUDE.md). The short version:

- **TypeScript strict.** No `any`, no `@ts-ignore`, no non-null assertions to
  get past the type checker — fix the type instead.
- **Match the surrounding style.** Tailwind utilities inline, `camelCase` in
  TypeScript, `snake_case` for SQLite columns.
- **Every colour needs a `dark:` counterpart.** The app supports dark mode.
- **Keep components presentational.** Props in, callbacks out. Data fetching
  belongs in `app/page.tsx` or a `lib/` hook.
- **Comment *why*, not *what*.** Explain non-obvious decisions; do not narrate
  obvious code.
- **Accessibility is not optional.** Labels on inputs, alt text on images,
  correct ARIA on interactive widgets.
- **Do not reformat code you were not asked to change.** Unrelated churn makes
  review harder.

Two invariants that are easy to break by accident:

- **The `/api/analyze/*` routes must never write to the database.** They return
  estimates; only an explicit user action creates a log entry.
- **Totals are always computed from line items**, never taken from the model.

### Adding dependencies

Prefer the standard library, an existing dependency, or ~30 lines of local code
over a new package. If you do add one, justify it in the pull request: what it
does, why it cannot reasonably be done without it, and its size and maintenance
status.

Do not add a package requiring a new external service or account, and do not
bump Next.js, React, or Tailwind major versions as a side effect of unrelated
work.

### Changing the database schema

`lib/db.ts` runs `CREATE TABLE IF NOT EXISTS` at import time and **there are no
migrations**. Editing the `CREATE TABLE` text only affects databases created
from scratch — an existing `data/app.db` will not gain the column. Any schema
change needs an explicit `ALTER TABLE` guard, and should say in the pull request
how existing databases are handled.

## Testing requirements

There is **no test framework yet**. Until one exists, every change must pass:

```bash
npx tsc --noEmit && npm run lint && npm run build
```

and be **exercised manually in the browser** — say in your pull request what you
actually clicked through.

Once a framework lands (Vitest is the intended choice):

- New logic in `lib/` ships with tests.
- **Never write a test that calls the real Gemini API.** Mock the client.

Adding the test framework is itself a wanted contribution, and should come as
its own pull request rather than bundled into a feature.

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add serving quantity control to food cards
fix: scope the day query to the user's timezone
docs: document the migration constraint in db.ts
chore: add vitest and a first lib/gemini test
refactor: share image limits between client and server
```

Subject in the imperative mood, under ~72 characters. Keep commits focused —
do not mix documentation changes with application changes, or bundle unrelated
fixes into one commit.

**Never commit secrets, `data/`, `node_modules/`, `.next/`, or `*.tsbuildinfo`.**
Run `git status` before staging and check what you are about to include.

## Pull requests

A good pull request:

- **Does one thing.** Split unrelated changes.
- **Explains the why**, not just the what. Link the issue it addresses.
- **Says how you verified it** — the commands you ran, and what you clicked
  through in the browser.
- **Includes screenshots for UI changes**, in both light and dark mode.
- **Flags anything you deliberately did not do**, and why.
- **Notes any decision that reverses an existing one.** The dated logs in
  `docs/` record why things are the way they are; if you are undoing one, say so
  explicitly rather than silently reversing it.

If your change involves a non-obvious design decision, add a dated decision log
at `docs/YYYY-MM-DD-short-slug.md` following the format of the existing ones:
*what was built*, *technical choices and why*, *verification*, and *known
simplifications*.

Update the standing docs when your change affects them — `docs/product.md` for
behaviour, `docs/architecture.md` for structure, `docs/roadmap.md` for what is
done or next. **Never document a feature that does not exist yet**; planned work
belongs in the roadmap, marked as planned.

## Code quality

Reviews look for:

- Correctness first — especially around the log's state, which lives in exactly
  one place (`app/page.tsx`).
- Whether the change fits the existing architecture or fights it.
- Input validation on anything crossing the network boundary.
- No secrets, no `dangerouslySetInnerHTML`, no string-built SQL.
- Errors that a person can act on, not raw status codes.

Small, focused, well-explained pull requests get reviewed fastest.

## Security

Found a vulnerability? **Do not open a public issue.** See
[SECURITY.md](SECURITY.md) for how to report it.
