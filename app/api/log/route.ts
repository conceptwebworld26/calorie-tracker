import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Food, LogEntry, MealType } from "@/lib/types";
import { isMealType, mealForHour } from "@/lib/meals";

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
        logged_at as loggedAt,
        meal
      FROM log_entries
      WHERE logged_at >= ?
      ORDER BY logged_at ASC`
    )
    .all(startOfTodayISO()) as LogEntry[];

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const food = body as Food & { meal?: unknown };

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

  const now = new Date();
  // An unspecified meal is inferred rather than rejected, so an older client
  // or a direct POST still lands somewhere sensible.
  const meal: MealType = isMealType(food.meal)
    ? food.meal
    : mealForHour(now.getHours());
  const loggedAt = now.toISOString();

  const result = db
    .prepare(
      `INSERT INTO log_entries (food_id, name, calories, protein, carbs, fat, serving_size, logged_at, meal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      food.id,
      food.name,
      food.calories,
      food.protein,
      food.carbs,
      food.fat,
      food.servingSize,
      loggedAt,
      meal
    );

  const entry: LogEntry = {
    id: food.id,
    name: food.name,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    servingSize: food.servingSize,
    logId: Number(result.lastInsertRowid),
    loggedAt,
    meal,
  };

  return NextResponse.json(entry, { status: 201 });
}
