# Security Policy

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
pull requests, or discussions.**

Report privately through
[GitHub's private vulnerability reporting](https://github.com/conceptwebworld26/calorie-tracker/security/advisories/new)
(Security → Report a vulnerability on the repository).

Please include:

- A description of the issue and why it is a security problem
- Steps to reproduce, or a proof of concept
- The affected file, route, or component
- Your assessment of the impact

**What to expect:** an acknowledgement within 7 days, an assessment of validity
and severity, and a fix released as soon as practical for confirmed issues. This
is a small hobby project maintained in spare time — there is no bug bounty and
no formal SLA, but reports are taken seriously and credit is given unless you
prefer otherwise.

Please give a reasonable window to release a fix before disclosing publicly.

## Scope

This project has an unusual threat model, so please read this before reporting.

**Calorie Tracker is designed as a local, single-user tool.** It has no
authentication, no authorization, and no rate limiting, by design. The following
are **known and documented properties, not vulnerabilities**, and reports about
them will be closed as out of scope:

- Any visitor to a running instance can read and modify the log
- `/api/analyze/*` can be called by anyone who can reach the server
- `POST /api/log` accepts any numeric values, without range checks
- No CSRF protection exists, since there is no session to forge
- Day scoping uses the server's local time and is wrong across timezones

They are recorded in [docs/architecture.md](docs/architecture.md) under
*Security posture*, along with what would need to change before hosting this
publicly.

**In scope** — please do report:

- Anything that could leak `GEMINI_API_KEY` to the client or into logs
- SQL injection, or any query not using bound parameters
- XSS, including via model-generated text (`note`, item names)
- Path traversal or arbitrary file read/write via the image upload
- A way to make the server perform unbounded work from a single request
- Vulnerable dependencies with a practical exploit path in this codebase
- A secret committed anywhere in the repository or its history

## Deploying this application

If you host this on a public network, understand what you are exposing:

1. **Anyone who can reach it shares one log.** There is no user separation.
2. **Anyone who can reach it can spend your Gemini quota.** There is no rate
   limiting on `/api/analyze/*`, and every call costs money.
3. **`POST /api/log` trusts the client's numbers.** Types are validated;
   ranges and string lengths are not.

Authentication, rate limiting, and input hardening must all land together before
a public deployment. For personal use, run it locally or behind a private
network or VPN.

## Secrets and environment variables

**Never commit API keys, tokens, credentials, or private keys** — not in source,
tests, documentation, commit messages, screenshots, or issue comments.

- All configuration lives in `.env`, which is **gitignored**. Keep it that way.
- `.env.example` documents the variable names with **placeholder values only**.
  Never put a real key there.
- **`GEMINI_API_KEY` is server-only.** It is read inside `lib/gemini.ts`, which
  is imported only by route handlers. Never prefix it with `NEXT_PUBLIC_`, and
  never pass it into a client component — either would ship your key to every
  visitor's browser.
- **Never commit `data/`.** The SQLite database holds real logged meals. It is
  gitignored.

If you commit a secret by accident, **treat it as compromised**: revoke and
rotate the key immediately at its provider. Removing it in a later commit does
not help — it remains in the history and may already be indexed.

## Expectations for contributors

- **Validate anything crossing the network boundary** before it reaches the
  database or the model.
- **Use prepared statements with bound parameters** for all SQL. Never build a
  query by string concatenation.
- **Treat user text and photos as untrusted input to the model.** The
  `responseSchema` constraint plus the numeric validation in `lib/gemini.ts` is
  the defence against prompt injection steering the output. Do not relax it, and
  do not accept a model-supplied total.
- **Render model output as text only.** Never pass `note` or an item name to
  `dangerouslySetInnerHTML`.
- **Check `git status` before staging.** Generated files (`.next/`, `data/`,
  `*.tsbuildinfo`) and `.env` must never be committed.
- **Justify new dependencies.** Each one is new attack surface; see
  [CONTRIBUTING.md](CONTRIBUTING.md).

## Data and privacy

Calorie Tracker collects nothing and phones nothing home. There is no analytics,
no error reporting, and no telemetry.

Your log lives only in `data/app.db` on the machine running the app. The one
outbound call is to the Gemini API, and only when you use the Describe or Photo
tab — which sends **your meal description or your photo** to Google. Google's
handling of that data is governed by their own terms; if that matters to you,
use the Common foods tab, which makes no external calls.

## Supported versions

This is a pre-1.0 project with no release branches. Fixes land on `main`, which
is the only supported version. Please confirm an issue reproduces on the latest
`main` before reporting.
