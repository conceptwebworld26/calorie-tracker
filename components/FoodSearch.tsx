"use client";

import { useMemo, useState } from "react";
import { Food } from "@/lib/types";
import { FOODS } from "@/lib/foods";
import FoodCard, { AddState } from "./FoodCard";

export default function FoodSearch({
  onAdd,
  pendingId,
  addedId,
}: {
  onAdd: (food: Food) => void;
  pendingId: string | null;
  addedId: string | null;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FOODS;
    return FOODS.filter((food) => food.name.toLowerCase().includes(q));
  }, [query]);

  function stateFor(id: string): AddState {
    if (pendingId === id) return "adding";
    if (addedId === id) return "added";
    return "idle";
  }

  return (
    <div>
      <label htmlFor="food-search" className="sr-only">
        Search common foods
      </label>
      <div className="relative">
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          fill="none"
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3"
        >
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10.5 10.5L14 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          id="food-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 24 common foods"
          className="h-10 w-full rounded-xl border border-rule-strong bg-surface pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-ink-3 focus:border-ink"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-rule-strong px-4 py-8 text-center text-sm text-ink-2">
          No common food matches &ldquo;{query}&rdquo;. Try Describe instead —
          it handles anything you can put into words.
        </p>
      ) : (
        /* The catalogue is capped in height so it cannot push today's log off
           the screen. Searching is the fast path; scrolling is the fallback. */
        <div className="mt-3 max-h-80 overflow-y-auto overscroll-contain rounded-xl border border-rule bg-sunken/60 p-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((food) => (
              <FoodCard
                key={food.id}
                food={food}
                onAdd={onAdd}
                state={stateFor(food.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
