"use client";

import { Food, Goals, LogEntry, MealType } from "./types";
import { DEFAULT_GOALS, parseGoals } from "./goals";
import { isMealType } from "./meals";

/*
 * Persistence for the demo build.
 *
 * The log and the goals live in the visitor's own browser. There is no
 * database and no server-side storage: this deployment is a public portfolio
 * demo with no accounts, so a shared server-side log would be one log for
 * every visitor at once. localStorage gives each visitor their own.
 *
 * The trade-off is stated plainly in the footer — the log is per-browser and
 * goes when site data goes.
 */

const LOG_KEY = "plate.log.v1";
const GOALS_KEY = "plate.goals.v1";

/** Entries older than this are dropped on the next write, so a browser that
 *  keeps the demo around for months does not grow without limit. */
const KEEP_DAYS = 30;

/**
 * Whether this browser will actually let us store anything. Private-mode and
 * "block site data" settings make `localStorage` present but throwing, so the
 * only reliable check is to use it.
 */
export function isStorageAvailable(): boolean {
  try {
    const probe = "plate.probe";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function readRaw(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    // Unavailable, or somebody hand-edited it into invalid JSON.
    return null;
  }
}

function writeRaw(key: string, value: unknown): void {
  // Deliberately not swallowed: a failed write means the entry the person just
  // added did not persist, and the page needs to be able to say so.
  window.localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Anything read back out of localStorage is untrusted — it survives across
 * versions of this app and a visitor can edit it by hand. A row that does not
 * look like a `LogEntry` is dropped rather than allowed to reach the UI as
 * `NaN`, which is the same rule `lib/gemini.ts` applies to model output.
 */
function isValidEntry(value: unknown): value is LogEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;

  return (
    typeof entry.logId === "number" &&
    Number.isFinite(entry.logId) &&
    typeof entry.id === "string" &&
    typeof entry.name === "string" &&
    typeof entry.servingSize === "string" &&
    typeof entry.loggedAt === "string" &&
    !Number.isNaN(Date.parse(entry.loggedAt)) &&
    isMealType(entry.meal) &&
    (["calories", "protein", "carbs", "fat"] as const).every(
      (macro) =>
        typeof entry[macro] === "number" && Number.isFinite(entry[macro])
    )
  );
}

function readAllEntries(): LogEntry[] {
  const raw = readRaw(LOG_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidEntry).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
}

/**
 * Whether a timestamp falls on the visitor's own calendar day.
 *
 * Deciding this in the browser is the point. Scoping the day on the server
 * would compare the *host's* midnight against UTC timestamps, which is only
 * correct when the host and the reader share a timezone — and on a UTC host,
 * never. Reading the date parts here asks the only clock that matters.
 */
function isSameLocalDay(iso: string, now: Date): boolean {
  const date = new Date(iso);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function prune(entries: LogEntry[], now: Date): LogEntry[] {
  const cutoff = now.getTime() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  return entries.filter((entry) => Date.parse(entry.loggedAt) >= cutoff);
}

export function readTodaysEntries(now = new Date()): LogEntry[] {
  return readAllEntries().filter((entry) => isSameLocalDay(entry.loggedAt, now));
}

export function readGoals(): Goals {
  return parseGoals(readRaw(GOALS_KEY)) ?? DEFAULT_GOALS;
}

/**
 * The page's initial read. Async because `localStorage` does not exist during
 * the server render — awaiting it moves the read past hydration, so the markup
 * the server produced and the markup React hydrates always agree.
 */
export async function loadDay(): Promise<{ entries: LogEntry[]; goals: Goals }> {
  return { entries: readTodaysEntries(), goals: readGoals() };
}

/** Ids only have to be unique within one browser, so the next one up is enough. */
function nextLogId(entries: LogEntry[]): number {
  return entries.reduce((max, entry) => Math.max(max, entry.logId), 0) + 1;
}

export function addEntry(food: Food, meal: MealType): LogEntry {
  const all = readAllEntries();
  const now = new Date();

  const entry: LogEntry = {
    id: food.id,
    name: food.name,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    servingSize: food.servingSize,
    logId: nextLogId(all),
    loggedAt: now.toISOString(),
    meal,
  };

  writeRaw(LOG_KEY, prune([...all, entry], now));
  return entry;
}

export function removeEntry(logId: number): void {
  const remaining = readAllEntries().filter((entry) => entry.logId !== logId);
  writeRaw(LOG_KEY, remaining);
}

export function writeGoals(goals: Goals): Goals {
  const parsed = parseGoals(goals);
  if (!parsed) throw new Error("Invalid goals");
  writeRaw(GOALS_KEY, parsed);
  return parsed;
}
