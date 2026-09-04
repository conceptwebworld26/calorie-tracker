import { LogEntry } from "@/lib/types";

export default function LogEntryRow({
  entry,
  onRemove,
}: {
  entry: LogEntry;
  onRemove: (logId: number) => void;
}) {
  const time = new Date(entry.loggedAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate font-medium">{entry.name}</p>
        <p className="text-xs text-neutral-500">
          {time} · {entry.servingSize} · {Math.round(entry.calories)} kcal
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(entry.logId)}
        aria-label={`Remove ${entry.name}`}
        className="shrink-0 rounded-md px-2 py-1 text-sm text-neutral-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
      >
        Remove
      </button>
    </div>
  );
}
