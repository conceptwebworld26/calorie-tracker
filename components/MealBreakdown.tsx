import { LogEntry } from "@/lib/types";
import { MEALS } from "@/lib/meals";
import { kcal } from "@/lib/format";

/**
 * Where the day's calories went, as plain rows. Deliberately not bars: the
 * card already carries four of those, and a fifth group would turn a summary
 * into a chart. Every meal is listed, empty ones included — an empty dinner is
 * information.
 */
export default function MealBreakdown({ entries }: { entries: LogEntry[] }) {
  return (
    <dl className="divide-y divide-rule">
      {MEALS.map(({ id, label }) => {
        const calories = entries
          .filter((entry) => entry.meal === id)
          .reduce((sum, entry) => sum + entry.calories, 0);

        return (
          <div key={id} className="flex items-baseline justify-between py-2">
            <dt className="text-sm text-ink-2">{label}</dt>
            <dd className="text-sm">
              {calories > 0 ? (
                <>
                  <span className="font-medium">{kcal(calories)}</span>
                  <span className="text-ink-3"> kcal</span>
                </>
              ) : (
                <span className="text-ink-3">none yet</span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
