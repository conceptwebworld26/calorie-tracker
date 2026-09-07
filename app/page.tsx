"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Food, Goals, LogEntry, MealType } from "@/lib/types";
import { DEFAULT_GOALS } from "@/lib/goals";
import { describeToday } from "@/lib/today";
import { fetchDay } from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import DaySummary from "@/components/DaySummary";
import AddFood from "@/components/AddFood";
import FoodLog from "@/components/FoodLog";
import DaySkeleton from "@/components/DaySkeleton";
import ErrorNotice from "@/components/ErrorNotice";

export default function Home() {
  const [today] = useState(describeToday);

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  // Starts on whichever meal it currently is, which saves a tap most of the
  // time. It is only the initial value — the picker owns it from then on.
  const [meal, setMeal] = useState<MealType>(today.meal);

  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const day = await fetchDay();
        if (!active) return;
        setEntries(day.entries);
        setGoals(day.goals);
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
    };
  }, []);

  const retry = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const day = await fetchDay();
      setEntries(day.entries);
      setGoals(day.goals);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAdd = useCallback(
    async (food: Food) => {
      setPendingId(food.id);
      try {
        const res = await fetch("/api/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...food, meal }),
        });
        if (!res.ok) return;
        const entry: LogEntry = await res.json();
        setEntries((prev) => [...prev, entry]);

        // A moment of confirmation on the button that was pressed, so adding
        // several things in a row does not feel like nothing happened.
        setAddedId(food.id);
        if (addedTimer.current) clearTimeout(addedTimer.current);
        addedTimer.current = setTimeout(() => setAddedId(null), 1400);
      } finally {
        setPendingId(null);
      }
    },
    [meal]
  );

  /**
   * Logs several AI-identified foods in one go. POSTs run in sequence rather
   * than in parallel so `loggedAt` preserves the order shown in the
   * confirmation list — GET /api/log sorts by it. Throws so the caller can
   * surface a save failure.
   */
  const handleAddMany = useCallback(
    async (foods: Food[]) => {
      const added: LogEntry[] = [];
      for (const food of foods) {
        const res = await fetch("/api/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...food, meal }),
        });
        if (!res.ok) {
          // Keep whatever did save; the log is the source of truth on refresh.
          setEntries((prev) => [...prev, ...added]);
          throw new Error("Failed to add entry");
        }
        added.push(await res.json());
      }
      setEntries((prev) => [...prev, ...added]);
    },
    [meal]
  );

  const handleRemove = useCallback(async (logId: number) => {
    setEntries((prev) => prev.filter((entry) => entry.logId !== logId));
    const res = await fetch(`/api/log/${logId}`, { method: "DELETE" });
    if (!res.ok) {
      // Put the row back by taking the server's word for it.
      const fresh = await fetch("/api/log").then((r) => r.json());
      setEntries(fresh);
    }
  }, []);

  const handleSaveGoals = useCallback(async (next: Goals) => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) throw new Error("Failed to save goals");
    setGoals(await res.json());
  }, []);

  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, entry) => ({
          calories: acc.calories + entry.calories,
          protein: acc.protein + entry.protein,
          carbs: acc.carbs + entry.carbs,
          fat: acc.fat + entry.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [entries]
  );

  return (
    <>
      <AppHeader date={today} consumed={totals.calories} goal={goals.calories} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {loadError ? (
          <ErrorNotice
            message="Today's log didn't load. Check the server is running."
            onRetry={retry}
          />
        ) : loading ? (
          <DaySkeleton />
        ) : (
          /* Two columns once there is room: the day's standing stays in view
             on the left while the log and the add panel scroll on the right. */
          <div className="grid gap-6 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start lg:gap-8">
            <div className="lg:sticky lg:top-20">
              <DaySummary
                totals={totals}
                goals={goals}
                entries={entries}
                onSaveGoals={handleSaveGoals}
              />
            </div>

            <div className="space-y-8">
              <AddFood
                onAdd={handleAdd}
                onAddMany={handleAddMany}
                pendingId={pendingId}
                addedId={addedId}
                meal={meal}
                onMealChange={setMeal}
              />
              <FoodLog entries={entries} onRemove={handleRemove} />
            </div>
          </div>
        )}
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-8 pt-2 sm:px-6">
        <p className="text-xs text-ink-3">
          Estimates from photos and descriptions are approximate. Everything you
          log stays on this machine.
        </p>
      </footer>
    </>
  );
}
