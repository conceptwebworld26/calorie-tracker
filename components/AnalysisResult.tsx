"use client";

import { useMemo, useState } from "react";
import { Food, NutritionAnalysis } from "@/lib/types";
import Spinner from "./Spinner";
import ErrorNotice from "./ErrorNotice";

/**
 * Confirmation step for an AI lookup. Nothing reaches the log until the user
 * presses Add, and every identified food is listed so they can drop the ones
 * Gemini got wrong or didn't actually eat.
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

  const totals = useMemo(
    () =>
      chosen.reduce(
        (acc, item) => ({
          calories: acc.calories + item.calories,
          protein: acc.protein + item.protein,
          carbs: acc.carbs + item.carbs,
          fat: acc.fat + item.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [chosen]
  );

  if (analysis.items.length === 0) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-dashed border-black/10 px-4 py-6 text-center text-sm text-neutral-500 dark:border-white/10">
          {emptyMessage}
          {analysis.note && (
            <span className="mt-1 block text-xs text-neutral-400">
              {analysis.note}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="text-sm text-neutral-500 underline underline-offset-4 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          Start over
        </button>
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
      setSaveError("Couldn't save to your log. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Found {analysis.items.length}{" "}
          {analysis.items.length === 1 ? "food" : "foods"}. Uncheck anything you
          didn&apos;t eat.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-sm text-neutral-500 underline underline-offset-4 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          Start over
        </button>
      </div>

      <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
        {analysis.items.map((item) => (
          <li key={item.id}>
            <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggle(item.id)}
                className="size-4 shrink-0 accent-neutral-900 dark:accent-white"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.name}</span>
                <span className="block text-xs text-neutral-500">
                  {item.servingSize} · {item.calories} kcal · P{item.protein} C
                  {item.carbs} F{item.fat}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {analysis.note && (
        <p className="text-xs text-neutral-500">
          <span className="font-medium">Note:</span> {analysis.note}
        </p>
      )}

      {saveError && <ErrorNotice message={saveError} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm tabular-nums text-neutral-600 dark:text-neutral-400">
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {Math.round(totals.calories)} kcal
          </span>{" "}
          · P{Math.round(totals.protein)} C{Math.round(totals.carbs)} F
          {Math.round(totals.fat)}
        </p>
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || chosen.length === 0}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {saving ? (
            <Spinner label="Adding…" />
          ) : (
            `Add ${chosen.length} to log`
          )}
        </button>
      </div>
    </div>
  );
}
