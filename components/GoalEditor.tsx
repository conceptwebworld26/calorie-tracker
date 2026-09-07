"use client";

import { FormEvent, useState } from "react";
import { Goals } from "@/lib/types";
import { GOAL_LIMITS } from "@/lib/goals";
import Button from "./Button";
import Spinner from "./Spinner";
import ErrorNotice from "./ErrorNotice";

const FIELDS: { key: keyof Goals; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
];

export default function GoalEditor({
  goals,
  onSave,
  onClose,
}: {
  goals: Goals;
  onSave: (goals: Goals) => Promise<void>;
  onClose: () => void;
}) {
  // Kept as strings so a half-typed field stays exactly as typed rather than
  // snapping back to a coerced number on every keystroke.
  const [draft, setDraft] = useState<Record<keyof Goals, string>>({
    calories: String(goals.calories),
    protein: String(goals.protein),
    carbs: String(goals.carbs),
    fat: String(goals.fat),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = {} as Goals;

    for (const { key, label } of FIELDS) {
      const value = Number(draft[key]);
      const { min, max } = GOAL_LIMITS[key];
      if (!Number.isFinite(value) || draft[key].trim() === "") {
        setError(`${label} needs a number.`);
        return;
      }
      if (value < min || value > max) {
        setError(`${label} has to be between ${min} and ${max}.`);
        return;
      }
      parsed[key] = Math.round(value);
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(parsed);
      onClose();
    } catch {
      setError("Your goals didn't save. Check the server is running and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t border-rule pt-4">
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(({ key, label, unit }) => (
          <div key={key} className="space-y-1.5">
            <label
              htmlFor={`goal-${key}`}
              className="block text-sm font-medium text-ink-2"
            >
              {label}
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`goal-${key}`}
                type="number"
                inputMode="numeric"
                min={GOAL_LIMITS[key].min}
                max={GOAL_LIMITS[key].max}
                value={draft[key]}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className="h-10 w-full rounded-xl border border-rule-strong bg-surface px-3 text-sm outline-none transition-colors focus:border-ink"
              />
              <span className="w-8 shrink-0 text-sm text-ink-3">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {error && <ErrorNotice message={error} />}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={saving}>
          {saving ? <Spinner label="Saving" /> : "Save goals"}
        </Button>
        <Button type="button" variant="quiet" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
