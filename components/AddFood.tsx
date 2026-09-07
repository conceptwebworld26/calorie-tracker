"use client";

import { useState } from "react";
import { Food, MealType } from "@/lib/types";
import Tabs from "./Tabs";
import MealPicker from "./MealPicker";
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
  addedId,
  meal,
  onMealChange,
}: {
  onAdd: (food: Food) => void;
  onAddMany: (foods: Food[]) => Promise<void>;
  pendingId: string | null;
  addedId: string | null;
  meal: MealType;
  onMealChange: (meal: MealType) => void;
}) {
  const [tab, setTab] = useState<TabId>("quick");

  return (
    <section aria-labelledby="add-heading">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h2 id="add-heading" className="text-base font-semibold">
          Add food
        </h2>
        <MealPicker meal={meal} onChange={onMealChange} />
      </div>

      <div className="mt-4">
        <Tabs
          tabs={TABS}
          active={tab}
          onChange={setTab}
          label="How to add a food"
        />
      </div>

      {/* Each panel keeps its own state, so switching tabs mid-analysis and
          coming back would lose it — panels stay mounted and are just hidden. */}
      <div
        role="tabpanel"
        id="panel-quick"
        aria-labelledby="tab-quick"
        hidden={tab !== "quick"}
        className="mt-4"
      >
        <FoodSearch onAdd={onAdd} pendingId={pendingId} addedId={addedId} />
      </div>
      <div
        role="tabpanel"
        id="panel-describe"
        aria-labelledby="tab-describe"
        hidden={tab !== "describe"}
        className="mt-4"
      >
        <DescribeFood onAddMany={onAddMany} />
      </div>
      <div
        role="tabpanel"
        id="panel-photo"
        aria-labelledby="tab-photo"
        hidden={tab !== "photo"}
        className="mt-4"
      >
        <PhotoFood onAddMany={onAddMany} />
      </div>
    </section>
  );
}
