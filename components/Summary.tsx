type Totals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export default function Summary({ totals }: { totals: Totals }) {
  return (
    <div className="sticky top-0 z-10 border-b border-black/10 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-black/80">
      <div className="mx-auto flex max-w-3xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Today&apos;s calories
          </p>
          <p className="text-3xl font-semibold tabular-nums">
            {Math.round(totals.calories)}
          </p>
        </div>
        <div className="flex gap-4 text-sm text-neutral-600 dark:text-neutral-400">
          <span className="tabular-nums">
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {Math.round(totals.protein)}g
            </span>{" "}
            protein
          </span>
          <span className="tabular-nums">
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {Math.round(totals.carbs)}g
            </span>{" "}
            carbs
          </span>
          <span className="tabular-nums">
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {Math.round(totals.fat)}g
            </span>{" "}
            fat
          </span>
        </div>
      </div>
    </div>
  );
}
