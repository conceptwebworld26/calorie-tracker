import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_GOALS, parseGoals } from "@/lib/goals";

const GOALS_KEY = "goals";

export async function GET() {
  const row = db
    .prepare(`SELECT value FROM settings WHERE key = ?`)
    .get(GOALS_KEY) as { value: string } | undefined;

  if (!row) return NextResponse.json(DEFAULT_GOALS);

  // A hand-edited or older row should not break the page; fall back instead.
  try {
    return NextResponse.json(parseGoals(JSON.parse(row.value)) ?? DEFAULT_GOALS);
  } catch {
    return NextResponse.json(DEFAULT_GOALS);
  }
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const goals = parseGoals(body);
  if (!goals) {
    return NextResponse.json(
      { error: "Every goal must be a number within its allowed range." },
      { status: 400 }
    );
  }

  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(GOALS_KEY, JSON.stringify(goals));

  return NextResponse.json(goals);
}
