import { Goals, LogEntry } from "./types";

/**
 * Everything the page needs for today, in one round trip pair. Both requests
 * go together because the summary is meaningless without both halves.
 */
export async function fetchDay(): Promise<{
  entries: LogEntry[];
  goals: Goals;
}> {
  const [logRes, goalsRes] = await Promise.all([
    fetch("/api/log"),
    fetch("/api/settings"),
  ]);

  if (!logRes.ok || !goalsRes.ok) {
    throw new Error("Failed to load today");
  }

  const [entries, goals] = await Promise.all([logRes.json(), goalsRes.json()]);
  return { entries, goals };
}
