import { LogEntry } from "@/lib/types";
import { MEALS } from "@/lib/meals";
import MealSection from "./MealSection";

export default function FoodLog({
  entries,
  onRemove,
}: {
  entries: LogEntry[];
  onRemove: (logId: number) => void;
}) {
  // Only meals that actually have food get a heading — four empty headings
  // every morning would be four things to read past.
  const grouped = MEALS.map((meal) => ({
    ...meal,
    entries: entries.filter((entry) => entry.meal === meal.id),
  })).filter((group) => group.entries.length > 0);

  return (
    <section aria-labelledby="log-heading">
      <h2 id="log-heading" className="text-base font-semibold">
        Today&apos;s log
      </h2>

      {grouped.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-rule-strong bg-surface/50 px-6 py-10 text-center">
          <p className="font-medium">Nothing logged yet</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-ink-2">
            Add your first food above — pick a common one, describe your meal,
            or take a photo of your plate.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-7">
          {grouped.map((group) => (
            <MealSection
              key={group.id}
              label={group.label}
              entries={group.entries}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </section>
  );
}
