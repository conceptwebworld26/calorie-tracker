"use client";

import { goalTone } from "@/lib/progress";
import { kcal } from "@/lib/format";

const LINE: Record<string, string> = {
  good: "bg-good",
  warn: "bg-warn",
  over: "bg-over",
};

/**
 * Name, date, and a thin meter of the day so far. The meter is why the header
 * is sticky: the summary card scrolls away, but how much of the day is spent
 * stays in view, aligned to the same column as everything else.
 */
export default function AppHeader({
  date,
  consumed,
  goal,
}: {
  date: { long: string; short: string };
  consumed: number;
  goal: number;
}) {
  const percent = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;
  const tone = goalTone(consumed, goal);

  return (
    <header className="sticky top-0 z-20 border-b border-rule bg-paper/85 backdrop-blur-md">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-[-0.02em]">Plate</span>
            <span className="hidden text-sm text-ink-3 sm:inline">
              daily food log
            </span>
          </div>
          {/* Server and browser can format a date differently; the browser's
              version is the one that sticks after hydration. */}
          <p className="text-right text-sm text-ink-2">
            <span suppressHydrationWarning className="hidden sm:inline">
              {date.long}
            </span>
            <span suppressHydrationWarning className="sm:hidden">
              {date.short}
            </span>
          </p>
        </div>

        <div
          className="h-[3px] w-full overflow-hidden rounded-full bg-sunken"
          role="progressbar"
          aria-label="Calories eaten today"
          aria-valuenow={Math.round(consumed)}
          aria-valuemin={0}
          aria-valuemax={Math.round(goal)}
          aria-valuetext={`${kcal(consumed)} of ${kcal(goal)} calories`}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ease-out ${LINE[tone]}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="h-2" />
      </div>
    </header>
  );
}
