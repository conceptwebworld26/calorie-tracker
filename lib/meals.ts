import { MealType } from "./types";

/** Display order everywhere a day is broken up. Not alphabetical — it is the
 *  order the meals actually happen in. */
export const MEALS: { id: MealType; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
];

const MEAL_IDS = MEALS.map((m) => m.id);

export function isMealType(value: unknown): value is MealType {
  return typeof value === "string" && MEAL_IDS.includes(value as MealType);
}

export function mealLabel(meal: MealType): string {
  return MEALS.find((m) => m.id === meal)?.label ?? "Snacks";
}

/**
 * The meal the add form starts on. Guessing from the clock is right often
 * enough to save a tap, and the picker is always there when it is wrong.
 */
export function mealForHour(hour: number): MealType {
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}
