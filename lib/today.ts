import { MealType } from "./types";
import { mealForHour } from "./meals";

export type Today = {
  long: string;
  short: string;
  hour: number;
  meal: MealType;
};

/**
 * The current date, formatted for display.
 *
 * Called from a `useState` initialiser rather than an effect, so the value is
 * there on first paint. The server render formats with the server's locale and
 * the browser re-formats with its own, which is why the header marks the date
 * as hydration-safe. That difference is cosmetic and one frame long; the state
 * React keeps after hydration is always the browser's.
 */
export function describeToday(): Today {
  const now = new Date();
  return {
    long: now.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    short: now.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    hour: now.getHours(),
    meal: mealForHour(now.getHours()),
  };
}
