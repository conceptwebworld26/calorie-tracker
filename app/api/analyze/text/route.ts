import { NextRequest, NextResponse } from "next/server";
import { analyzeNutrition, GeminiError } from "@/lib/gemini";

const MAX_DESCRIPTION_LENGTH = 500;

export async function POST(request: NextRequest) {
  let body: { description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  if (!description) {
    return NextResponse.json(
      { error: "A non-empty 'description' string is required" },
      { status: 400 }
    );
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  try {
    const analysis = await analyzeNutrition([
      `Estimate the nutrition for this meal: ${description}`,
    ]);
    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof GeminiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
