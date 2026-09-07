import { Goals } from "./types";

/** Shown until the person sets their own. Roughly a 2,000 kcal day split
 *  30/45/25 across protein, carbs and fat. */
export const DEFAULT_GOALS: Goals = {
  calories: 2000,
  protein: 150,
  carbs: 225,
  fat: 55,
};

export const GOAL_LIMITS = {
  calories: { min: 500, max: 10000 },
  protein: { min: 0, max: 500 },
  carbs: { min: 0, max: 1000 },
  fat: { min: 0, max: 500 },
} as const;

/**
 * Accepts a partial, possibly hostile object and returns real goals. Used on
 * both sides of the wire: the route validates with it, the client falls back
 * to it when the fetch fails.
 */
export function parseGoals(input: unknown): Goals | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  const out = { ...DEFAULT_GOALS };

  for (const key of Object.keys(GOAL_LIMITS) as (keyof Goals)[]) {
    const value = record[key];
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    const { min, max } = GOAL_LIMITS[key];
    if (value < min || value > max) return null;
    out[key] = Math.round(value);
  }

  return out;
}
