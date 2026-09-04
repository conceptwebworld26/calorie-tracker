import { LogEntry } from "@/lib/types";
import LogEntryRow from "./LogEntryRow";

export default function FoodLog({
  entries,
  onRemove,
}: {
  entries: LogEntry[];
  onRemove: (logId: number) => void;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">
        Today&apos;s log
      </h2>
      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/10 px-4 py-6 text-center text-sm text-neutral-500 dark:border-white/10">
          Nothing logged yet. Add a food below to get started.
        </p>
      ) : (
        <div className="divide-y divide-black/10 rounded-lg border border-black/10 px-4 dark:divide-white/10 dark:border-white/10">
          {entries.map((entry) => (
            <LogEntryRow key={entry.logId} entry={entry} onRemove={onRemove} />
          ))}
        </div>
      )}
    </section>
  );
}
