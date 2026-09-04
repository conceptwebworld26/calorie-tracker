import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Food, LogEntry } from "@/lib/types";

function startOfTodayISO() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

export async function GET() {
  const rows = db
    .prepare(
      `SELECT
        log_id as logId,
        food_id as id,
        name,
        calories,
        protein,
        carbs,
        fat,
        serving_size as servingSize,
        logged_at as loggedAt
      FROM log_entries
      WHERE logged_at >= ?
      ORDER BY logged_at ASC`
    )
    .all(startOfTodayISO()) as LogEntry[];

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const food = (await request.json()) as Food;

  if (
    !food?.id ||
    !food?.name ||
    typeof food.calories !== "number" ||
    typeof food.protein !== "number" ||
    typeof food.carbs !== "number" ||
    typeof food.fat !== "number" ||
    !food?.servingSize
  ) {
    return NextResponse.json({ error: "Invalid food payload" }, { status: 400 });
  }

  const loggedAt = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO log_entries (food_id, name, calories, protein, carbs, fat, serving_size, logged_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      food.id,
      food.name,
      food.calories,
      food.protein,
      food.carbs,
      food.fat,
      food.servingSize,
      loggedAt
    );

  const entry: LogEntry = {
    ...food,
    logId: Number(result.lastInsertRowid),
    loggedAt,
  };

  return NextResponse.json(entry, { status: 201 });
}
