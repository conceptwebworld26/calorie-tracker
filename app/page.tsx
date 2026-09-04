"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Food, LogEntry } from "@/lib/types";
import Summary from "@/components/Summary";
import AddFood from "@/components/AddFood";
import FoodLog from "@/components/FoodLog";

export default function Home() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/log")
      .then((res) => res.json())
      .then((data: LogEntry[]) => setEntries(data))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = useCallback(async (food: Food) => {
    setPendingId(food.id);
    try {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(food),
      });
      if (!res.ok) return;
      const entry: LogEntry = await res.json();
      setEntries((prev) => [...prev, entry]);
    } finally {
      setPendingId(null);
    }
  }, []);

  /**
   * Logs several AI-identified foods in one go. POSTs run in sequence rather
   * than in parallel so `loggedAt` preserves the order shown in the
   * confirmation list — GET /api/log sorts by it. Throws so the caller can
   * surface a save failure.
   */
  const handleAddMany = useCallback(async (foods: Food[]) => {
    const added: LogEntry[] = [];
    for (const food of foods) {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(food),
      });
      if (!res.ok) {
        // Keep whatever did save; the log is the source of truth on refresh.
        setEntries((prev) => [...prev, ...added]);
        throw new Error("Failed to add entry");
      }
      added.push(await res.json());
    }
    setEntries((prev) => [...prev, ...added]);
  }, []);

  const handleRemove = useCallback(async (logId: number) => {
    setEntries((prev) => prev.filter((e) => e.logId !== logId));
    const res = await fetch(`/api/log/${logId}`, { method: "DELETE" });
    if (!res.ok) {
      // revert on failure by refetching
      const fresh = await fetch("/api/log").then((r) => r.json());
      setEntries(fresh);
    }
  }, []);

  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, e) => ({
          calories: acc.calories + e.calories,
          protein: acc.protein + e.protein,
          carbs: acc.carbs + e.carbs,
          fat: acc.fat + e.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [entries]
  );

  return (
    <>
      <Summary totals={totals} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-6">
        {loading ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : (
          <>
            <FoodLog entries={entries} onRemove={handleRemove} />
            <AddFood
              onAdd={handleAdd}
              onAddMany={handleAddMany}
              pendingId={pendingId}
            />
          </>
        )}
      </main>
    </>
  );
}
