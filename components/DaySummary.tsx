"use client";

import { useState } from "react";
import { Goals, LogEntry, MacroTotals } from "@/lib/types";
import { goalTone, TONE_TEXT } from "@/lib/progress";
import { kcal } from "@/lib/format";
import Meter from "./Meter";
import MacroRow from "./MacroRow";
import MealBreakdown from "./MealBreakdown";
import GoalEditor from "./GoalEditor";
import Button from "./Button";

export default function DaySummary({
  totals,
  goals,
  entries,
  onSaveGoals,
}: {
  totals: MacroTotals;
  goals: Goals;
  entries: LogEntry[];
  onSaveGoals: (goals: Goals) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  const tone = goalTone(totals.calories, goals.calories);
  const difference = goals.calories - totals.calories;

  return (
    <section
      aria-label="Today's totals"
      className="rounded-2xl border border-rule bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-2">Eaten today</p>
          <p className="mt-1 text-5xl font-bold leading-none tracking-[-0.035em]">
            {kcal(totals.calories)}
          </p>
          <p className="mt-2 text-sm text-ink-3">of {kcal(goals.calories)} kcal</p>
        </div>
        <p className={`text-right text-lg font-semibold ${TONE_TEXT[tone]}`}>
          {difference >= 0
            ? `${kcal(difference)} left`
            : `${kcal(-difference)} over`}
        </p>
      </div>

      <div className="mt-4">
        <Meter
          value={totals.calories}
          max={goals.calories}
          tone={tone}
          size="lg"
          label="Calories against goal"
          valueText={`${kcal(totals.calories)} of ${kcal(goals.calories)} calories`}
        />
      </div>

      <div className="mt-6 space-y-3 border-t border-rule pt-5">
        <MacroRow
          name="Protein"
          tone="protein"
          value={totals.protein}
          goal={goals.protein}
        />
        <MacroRow
          name="Carbs"
          tone="carbs"
          value={totals.carbs}
          goal={goals.carbs}
        />
        <MacroRow name="Fat" tone="fat" value={totals.fat} goal={goals.fat} />
      </div>

      <div className="mt-6 border-t border-rule pt-5">
        <MealBreakdown entries={entries} />
      </div>

      {editing ? (
        <div className="mt-5">
          <GoalEditor
            goals={goals}
            onSave={onSaveGoals}
            onClose={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="mt-4 border-t border-rule pt-4">
          <Button
            type="button"
            variant="quiet"
            size="sm"
            onClick={() => setEditing(true)}
            className="-ml-3"
          >
            Edit goals
          </Button>
        </div>
      )}
    </section>
  );
}
