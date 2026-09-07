import { LogEntry } from "@/lib/types";
import { clockTime, grams, kcal } from "@/lib/format";

export default function LogEntryCard({
  entry,
  onRemove,
}: {
  entry: LogEntry;
  onRemove: (logId: number) => void;
}) {
  return (
    <li className="flex items-center gap-4 rounded-xl border border-rule bg-surface px-4 py-3 shadow-card transition-colors hover:border-rule-strong">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium leading-tight">{entry.name}</p>
        <p className="mt-0.5 truncate text-[0.8125rem] text-ink-3">
          {entry.servingSize} at {clockTime(entry.loggedAt)}
        </p>
      </div>

      {/* Hidden on the narrowest screens, where the name and the calorie count
          are all there is room for. */}
      <p className="hidden shrink-0 gap-3 text-xs text-ink-3 sm:flex">
        <span>
          <span className="text-protein">P</span> {grams(entry.protein)}
        </span>
        <span>
          <span className="text-carbs">C</span> {grams(entry.carbs)}
        </span>
        <span>
          <span className="text-fat">F</span> {grams(entry.fat)}
        </span>
      </p>

      <p className="w-20 shrink-0 text-right">
        <span className="font-semibold">{kcal(entry.calories)}</span>
        <span className="ml-1 text-[0.8125rem] text-ink-3">kcal</span>
      </p>

      <button
        type="button"
        onClick={() => onRemove(entry.logId)}
        aria-label={`Remove ${entry.name}`}
        className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-over-wash hover:text-over"
      >
        <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </li>
  );
}
