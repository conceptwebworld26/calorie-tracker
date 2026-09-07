"use client";

import { MealType } from "@/lib/types";
import { MEALS } from "@/lib/meals";

/**
 * Which meal the next thing added lands in. It sits above the tabs because it
 * applies to all three ways of adding food, not just the one on screen.
 */
export default function MealPicker({
  meal,
  onChange,
}: {
  meal: MealType;
  onChange: (meal: MealType) => void;
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <legend className="float-left mr-3 text-sm text-ink-2">Adding to</legend>
      <div className="flex flex-wrap gap-1.5">
        {MEALS.map(({ id, label }) => (
          <label
            key={id}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
              meal === id
                ? "border-ink bg-ink text-inverse"
                : "border-rule-strong bg-surface text-ink-2 hover:bg-hover hover:text-ink"
            }`}
          >
            <input
              type="radio"
              name="meal"
              value={id}
              checked={meal === id}
              onChange={() => onChange(id)}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
