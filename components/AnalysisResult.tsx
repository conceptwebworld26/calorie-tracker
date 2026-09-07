"use client";

import { useMemo, useState } from "react";
import { Food, NutritionAnalysis } from "@/lib/types";
import { grams, kcal } from "@/lib/format";
import Button from "./Button";
import Spinner from "./Spinner";
import ErrorNotice from "./ErrorNotice";

/**
 * Confirmation step for an AI lookup. Nothing reaches the log until the user
 * presses Add, and every identified food is listed so they can drop the ones
 * the model got wrong or that were never on the plate.
 */
export default function AnalysisResult({
  analysis,
  onAddMany,
  onDismiss,
  emptyMessage,
}: {
  analysis: NutritionAnalysis;
  onAddMany: (foods: Food[]) => Promise<void>;
  onDismiss: () => void;
  emptyMessage: string;
}) {
  // Everything starts checked — the common case is that the analysis is right.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(analysis.items.map((item) => item.id))
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const chosen = useMemo(
    () => analysis.items.filter((item) => selected.has(item.id)),
    [analysis.items, selected]
  );

  const totalCalories = useMemo(
    () => chosen.reduce((sum, item) => sum + item.calories, 0),
    [chosen]
  );

  if (analysis.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-rule-strong px-6 py-8 text-center">
        <p className="text-sm text-ink-2">{emptyMessage}</p>
        {analysis.note && (
          <p className="mt-1 text-xs text-ink-3">{analysis.note}</p>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onDismiss}
          className="mt-4"
        >
          Start over
        </Button>
      </div>
    );
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    setSaving(true);
    setSaveError(null);
    try {
      await onAddMany(chosen);
      onDismiss();
    } catch {
      setSaveError("That didn't save to your log. Try adding it again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-rule bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-ink-2">
          Found {analysis.items.length}{" "}
          {analysis.items.length === 1 ? "food" : "foods"}. Uncheck anything you
          didn&apos;t eat.
        </p>
        <Button
          type="button"
          variant="quiet"
          size="sm"
          onClick={onDismiss}
          className="-mr-2 shrink-0"
        >
          Start over
        </Button>
      </div>

      <ul className="divide-y divide-rule overflow-hidden rounded-lg border border-rule">
        {analysis.items.map((item) => {
          const isOn = selected.has(item.id);
          return (
            <li key={item.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 px-3.5 py-3 transition-opacity has-[:focus-visible]:bg-hover ${
                  isOn ? "" : "opacity-55"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(item.id)}
                  className="size-4 shrink-0 accent-[var(--ink)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium leading-tight">
                    {item.name}
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-3">
                    <span>{item.servingSize}</span>
                    <span>
                      <span className="text-protein">P</span>{" "}
                      {grams(item.protein)}
                    </span>
                    <span>
                      <span className="text-carbs">C</span> {grams(item.carbs)}
                    </span>
                    <span>
                      <span className="text-fat">F</span> {grams(item.fat)}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-sm">
                  <span className="font-semibold">{kcal(item.calories)}</span>
                  <span className="ml-1 text-xs text-ink-3">kcal</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {analysis.note && <p className="text-xs text-ink-3">{analysis.note}</p>}

      {saveError && <ErrorNotice message={saveError} />}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-3">
        <p className="text-sm text-ink-2">
          <span className="font-semibold text-ink">
            {kcal(totalCalories)} kcal
          </span>{" "}
          selected
        </p>
        <Button
          type="button"
          variant="primary"
          onClick={handleAdd}
          disabled={saving || chosen.length === 0}
        >
          {saving ? (
            <Spinner label="Adding" />
          ) : chosen.length === 0 ? (
            "Nothing selected"
          ) : (
            `Add ${chosen.length} to log`
          )}
        </Button>
      </div>
    </div>
  );
}
