import { Food } from "@/lib/types";
import { grams, kcal } from "@/lib/format";

/* Writes go straight to browser storage, so there is no in-flight state to
   show — a food is either not yet added or just added. */
export type AddState = "idle" | "added";

export default function FoodCard({
  food,
  onAdd,
  state,
}: {
  food: Food;
  onAdd: (food: Food) => void;
  state: AddState;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-rule bg-surface px-3.5 py-3 shadow-card transition-colors hover:border-rule-strong">
      <div className="min-w-0 flex-1">
        {/* Food names are long and the whole point of the row, so they wrap
            rather than truncate. */}
        <p className="text-sm font-medium leading-snug">{food.name}</p>
        <p className="mt-1 text-xs text-ink-3">
          {food.servingSize}, {kcal(food.calories)} kcal
        </p>
        <p className="mt-1 flex gap-2.5 text-xs text-ink-3">
          <span>
            <span className="text-protein">P</span> {grams(food.protein)}
          </span>
          <span>
            <span className="text-carbs">C</span> {grams(food.carbs)}
          </span>
          <span>
            <span className="text-fat">F</span> {grams(food.fat)}
          </span>
        </p>
      </div>

      <button
        type="button"
        onClick={() => onAdd(food)}
        disabled={state !== "idle"}
        aria-label={`Add ${food.name}`}
        className={`inline-flex h-8 w-[4.5rem] shrink-0 items-center justify-center gap-1 rounded-lg border text-[0.8125rem] font-medium transition-colors duration-150 disabled:cursor-default ${
          state === "added"
            ? "border-good/30 bg-good-wash text-good"
            : "border-rule-strong bg-surface text-ink hover:border-ink hover:bg-ink hover:text-inverse disabled:opacity-60"
        }`}
      >
        {state === "added" && (
          <>
            <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="none">
              <path
                d="M3.5 8.5l3 3 6-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Added
          </>
        )}
        {state === "idle" && "Add"}
      </button>
    </div>
  );
}
