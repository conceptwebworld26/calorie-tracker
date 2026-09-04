import { Food } from "@/lib/types";

export default function FoodCard({
  food,
  onAdd,
  disabled,
}: {
  food: Food;
  onAdd: (food: Food) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-black/10 px-4 py-3 dark:border-white/10">
      <div className="min-w-0">
        <p className="truncate font-medium">{food.name}</p>
        <p className="text-xs text-neutral-500">
          {food.servingSize} · {food.calories} kcal · P{food.protein} C{food.carbs} F{food.fat}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onAdd(food)}
        disabled={disabled}
        className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Add
      </button>
    </div>
  );
}
