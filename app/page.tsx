"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Food, Goals, LogEntry, MealType } from "@/lib/types";
import { DEFAULT_GOALS } from "@/lib/goals";
import { describeToday, Today } from "@/lib/today";
import {
  addEntry,
  isStorageAvailable,
  loadDay,
  readTodaysEntries,
  removeEntry,
  writeGoals,
} from "@/lib/storage";
import AppHeader from "@/components/AppHeader";
import DaySummary from "@/components/DaySummary";
import AddFood from "@/components/AddFood";
import FoodLog from "@/components/FoodLog";
import DaySkeleton from "@/components/DaySkeleton";
import ErrorNotice from "@/components/ErrorNotice";

export default function Home() {
  /*
   * The date is resolved after mount, never during render. This page is
   * statically prerendered, so anything `describeToday()` returned at render
   * time would be the *build* date, baked into the HTML and served to every
   * visitor until the next deploy. The only clock worth asking is the one in
   * the browser that is reading the page.
   */
  const [today, setToday] = useState<Today | null>(null);

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  // Set from the clock on first load, which saves a tap most of the time. It
  // is only the initial value — the picker owns it from then on.
  const [meal, setMeal] = useState<MealType>("snack");

  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const day = await loadDay();
        if (!active) return;
        const now = describeToday();
        setToday(now);
        setMeal(now.meal);
        setEntries(day.entries);
        setGoals(day.goals);
        // Reads work in private mode; writes are what fail. Check once, up
        // front, so the warning is there before the first Add rather than
        // after it silently does nothing.
        setStorageBlocked(!isStorageAvailable());
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
      const day = await loadDay();
      setToday(describeToday());
      setEntries(day.entries);
      setGoals(day.goals);
      setStorageBlocked(!isStorageAvailable());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAdd = useCallback(
    (food: Food) => {
      try {
        const entry = addEntry(food, meal);
        setEntries((prev) => [...prev, entry]);

        // A moment of confirmation on the button that was pressed, so adding
        // several things in a row does not feel like nothing happened.
        setAddedId(food.id);
        if (addedTimer.current) clearTimeout(addedTimer.current);
        addedTimer.current = setTimeout(() => setAddedId(null), 1400);
      } catch {
        setStorageBlocked(true);
      }
    },
    [meal]
  );

  /**
   * Logs several AI-identified foods in one go. Written one at a time so each
   * gets its own `loggedAt` and the order shown in the confirmation list is
   * the order they end up in. Throws so the caller can surface a save failure.
   */
  const handleAddMany = useCallback(
    async (foods: Food[]) => {
      const added: LogEntry[] = [];
      try {
        for (const food of foods) added.push(addEntry(food, meal));
      } catch (error) {
        // Keep whatever did save; storage is the source of truth on refresh.
        setEntries((prev) => [...prev, ...added]);
        setStorageBlocked(true);
        throw error;
      }
      setEntries((prev) => [...prev, ...added]);
    },
    [meal]
  );

  const handleRemove = useCallback((logId: number) => {
    setEntries((prev) => prev.filter((entry) => entry.logId !== logId));
    try {
      removeEntry(logId);
    } catch {
      // Put the row back by re-reading what actually persisted.
      setEntries(readTodaysEntries());
      setStorageBlocked(true);
    }
  }, []);

  const handleSaveGoals = useCallback(async (next: Goals) => {
    setGoals(writeGoals(next));
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
            message="Today's log didn't load from this browser's storage."
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
              {storageBlocked && (
                <ErrorNotice message="This browser is blocking site storage, so nothing you log here will be kept. Private browsing is the usual cause." />
              )}
              <AddFood
                onAdd={handleAdd}
                onAddMany={handleAddMany}
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
          Estimates from photos and descriptions are approximate. This demo
          keeps your log and goals in this browser only — clearing site data
          clears them.
        </p>
      </footer>
    </>
  );
}
