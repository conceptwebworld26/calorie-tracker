"use client";

import { useState } from "react";
import { Food } from "@/lib/types";
import FoodSearch from "./FoodSearch";
import DescribeFood from "./DescribeFood";
import PhotoFood from "./PhotoFood";

const TABS = [
  { id: "quick", label: "Common foods" },
  { id: "describe", label: "Describe" },
  { id: "photo", label: "Photo" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AddFood({
  onAdd,
  onAddMany,
  pendingId,
}: {
  onAdd: (food: Food) => void;
  onAddMany: (foods: Food[]) => Promise<void>;
  pendingId: string | null;
}) {
  const [tab, setTab] = useState<TabId>("quick");

  return (
    <section>
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">
        Add a food
      </h2>

      <div
        role="tablist"
        aria-label="How to add a food"
        className="mb-3 flex gap-1 rounded-lg bg-black/[0.04] p-1 dark:bg-white/[0.06]"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            type="button"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === id
                ? "bg-white shadow-sm dark:bg-neutral-800"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Each panel keeps its own state, so switching tabs mid-analysis and
          coming back would lose it — panels stay mounted and are just hidden. */}
      <div
        role="tabpanel"
        id="panel-quick"
        aria-labelledby="tab-quick"
        hidden={tab !== "quick"}
      >
        <FoodSearch onAdd={onAdd} pendingId={pendingId} />
      </div>
      <div
        role="tabpanel"
        id="panel-describe"
        aria-labelledby="tab-describe"
        hidden={tab !== "describe"}
      >
        <DescribeFood onAddMany={onAddMany} />
      </div>
      <div
        role="tabpanel"
        id="panel-photo"
        aria-labelledby="tab-photo"
        hidden={tab !== "photo"}
      >
        <PhotoFood onAddMany={onAddMany} />
      </div>
    </section>
  );
}
