# 2026-09-03 — AI nutrition lookup via the Gemini API

## What was built

Two backend-only API routes that estimate nutrition with Gemini, so foods no
longer have to come from the 24-item static catalog. **The frontend was not
touched** — these are lookup endpoints, ready to be wired into the UI as a
separate step.

- `POST /api/analyze/text` — takes `{ "description": "grilled chicken with rice and salad" }`
  and returns the meal broken into its component foods with macros.
- `POST /api/analyze/image` — takes `multipart/form-data` with an `image` file,
  and returns the foods Gemini identifies in the photo with macros.
- `lib/gemini.ts` — the shared client, prompt, response schema, and validation
  both routes call.
- `@google/genai` (v2.21.0) added as a dependency.

Both routes return the same shape:

```jsonc
{
  "items": [
    { "id": "ai-1", "name": "Grilled Chicken Breast", "servingSize": "150g",
      "calories": 248, "protein": 46.5, "carbs": 0, "fat": 5.3 }
  ],
  "total": { "calories": 553, "protein": 52.2, "carbs": 49.5, "fat": 14.2 },
  "note": "Assumed standard single servings for a balanced meal."
}
```

## Technical choices and why

**The model is `gemini-3.5-flash-lite`, not the requested `gemini-2.5-flash-lite`.**
`gemini-2.5-flash-lite` still appears in `models.list()`, but calling
`generateContent` on it returns a 404: *"This model is no longer available to
new users. Please update your code to use models/gemini-3.5-flash-lite."* The
API named its own replacement, so that is what is used. The model id reads from
`process.env.GEMINI_MODEL` with `gemini-3.5-flash-lite` as the default, so it
can be pointed back or moved forward from `.env` without a code change.

**`items[]` reuse the existing `Food` type exactly.**
An AI result is therefore already in the shape `POST /api/log` accepts — the
frontend can hand one straight to the existing log endpoint with no mapping
layer, and `Summary`/`FoodLog` render it unchanged. This is why `servingSize` is
returned as a string ("150g", "1 cup cooked") rather than a structured
quantity+unit: it matches what the catalog and the `log_entries` table already
store.

**`items[].id` is generated as `ai-1`, `ai-2`, … .**
Gemini never supplies the id. A generated prefix guarantees an AI result can't
collide with a catalog id like `chicken-breast`, which matters because
`FoodSearch` keys on `food.id` and the log stores it in `food_id`.

**`total` is summed server-side, never taken from the model.**
LLMs are unreliable at arithmetic, and a total that disagreed with its own line
items would be visible in the sticky summary header. The response schema
deliberately has no `total` field, so there is nothing for the model to get
wrong. Verified in testing: an 11-item photo result summed to exactly 3011 kcal
across all four macros.

**Structured output via `responseSchema`, not prompt-and-parse.**
The request sets `responseMimeType: "application/json"` plus an explicit schema,
so Gemini returns parseable JSON directly. The alternative — asking for JSON in
the prompt and stripping markdown code fences — fails intermittently and in ways
that are awkward to detect. `temperature` is 0.2 because a nutrition lookup
should be repeatable rather than creative.

**Items are still validated after parsing.**
The schema makes malformed items unlikely, not impossible, and a single
non-numeric field would otherwise propagate as `NaN` through the totals into the
UI. `isValidItem` drops anything that isn't fully numeric before summing.

**One shared `lib/gemini.ts` rather than logic in each route.**
The prompt, schema, parsing, and validation are identical for both routes; only
the input parts differ (a text string vs. a base64 `inlineData` part). This
keeps the routes thin over a lib module, matching how `api/log/route.ts` is thin
over `lib/db.ts`.

**Images arrive as `multipart/form-data`, not base64 in JSON.**
This maps directly onto an `<input type="file">` when the UI is built, with no
base64 encoding in the browser and no ~33% payload inflation. The route encodes
to base64 server-side because that is what the SDK's inline-data part takes.

**No database writes.**
These routes only look nutrition up. `POST /api/log` remains the single writer,
so the existing "log entries store a denormalized copy" guarantee is untouched,
and an AI estimate only reaches the database if the user explicitly logs it.

**A `GeminiError` carrying an HTTP status.**
Both routes need the same mapping from failure to status code (missing key →
500, upstream failure or unparseable output → 502). Carrying the status on the
error lets `lib/gemini.ts` own that decision once instead of both routes
re-deriving it from error strings.

## Verification

No test framework was added — the repo has none, and introducing Vitest was out
of scope for this change. Both routes were exercised with `curl` against the
live Gemini API:

| Case | Result |
|---|---|
| Text, multi-food ("grilled chicken with rice and salad") | 200 — 3 items, totals sum correctly |
| Text, simple ("two boiled eggs and a slice of toast") | 200 — 2 items |
| Text, non-food ("a blue plastic office chair") | 200 — empty `items`, explanatory `note` |
| Image, real food photo (3.1 MB JPEG) | 200 — 11 foods identified, totals sum correctly |
| Text, empty / missing `description` | 400 |
| Text, non-JSON body | 400 |
| Text, over 500 characters | 400 |
| Image, no `image` field | 400 |
| Image, non-multipart body | 400 |
| Image, non-image file (`text/plain`) | 400 |
| Image, 6 MB file | 400 |
| `GEMINI_API_KEY` unset | 500, clear message |
| Deprecated model id | 502, upstream message passed through |

`npx tsc --noEmit` and `npx eslint` both pass. `GET/POST/DELETE /api/log` were
re-checked afterwards and are unchanged.

## Known simplifications (not built)

- **No frontend.** Nothing in the UI calls these routes yet; that is the next step.
- **No caching or rate limiting.** Every request is a live Gemini call, billed
  and latent (~2-6s). Identical descriptions are not deduplicated.
- **No quantity control.** As with the catalog, the returned `servingSize` is
  whatever Gemini judged; there is still no multiplier.
- **Estimates are not flagged as estimates in the data model.** A logged AI item
  is indistinguishable from a catalog item once it is in `log_entries` — there
  is no `source` column. Worth adding if the UI needs to show confidence.
- **5 MB image cap, no downscaling.** Larger photos are rejected rather than
  resized client- or server-side.
