"use client";

import { useMemo, useState } from "react";
import { Food } from "@/lib/types";
import { FOODS } from "@/lib/foods";
import FoodCard from "./FoodCard";

export default function FoodSearch({
  onAdd,
  pendingId,
}: {
  onAdd: (food: Food) => void;
  pendingId: string | null;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FOODS;
    return FOODS.filter((food) => food.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search foods…"
        className="mb-3 w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-neutral-900"
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {filtered.map((food) => (
          <FoodCard
            key={food.id}
            food={food}
            onAdd={onAdd}
            disabled={pendingId === food.id}
          />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-neutral-500">
            No foods match &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
