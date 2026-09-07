export type GoalTone = "good" | "warn" | "over";

/**
 * Where the day stands against the calorie goal. Comfortably under is green,
 * the last quarter of the budget is amber, past it is red.
 */
export function goalTone(consumed: number, goal: number): GoalTone {
  if (goal <= 0) return "good";
  const ratio = consumed / goal;
  if (ratio > 1) return "over";
  if (ratio >= 0.75) return "warn";
  return "good";
}

export const TONE_TEXT: Record<GoalTone, string> = {
  good: "text-good",
  warn: "text-warn",
  over: "text-over",
};
