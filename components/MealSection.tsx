import { LogEntry } from "@/lib/types";
import { kcal } from "@/lib/format";
import LogEntryCard from "./LogEntryCard";

export default function MealSection({
  label,
  entries,
  onRemove,
}: {
  label: string;
  entries: LogEntry[];
  onRemove: (logId: number) => void;
}) {
  const calories = entries.reduce((sum, entry) => sum + entry.calories, 0);

  return (
    <section>
      {/* The heavier rule under a meal name and the hairlines around the cards
          are what separate the two levels — no extra labelling needed. */}
      <div className="flex items-baseline justify-between gap-3 border-b-2 border-rule-strong pb-2">
        <h3 className="flex items-baseline gap-2 font-semibold">
          {label}
          <span className="text-sm font-normal text-ink-3">
            {entries.length} {entries.length === 1 ? "item" : "items"}
          </span>
        </h3>
        <p className="shrink-0 text-sm text-ink-2">
          <span className="font-medium text-ink">{kcal(calories)}</span> kcal
        </p>
      </div>

      <ul className="mt-3 space-y-2">
        {entries.map((entry) => (
          <LogEntryCard key={entry.logId} entry={entry} onRemove={onRemove} />
        ))}
      </ul>
    </section>
  );
}
