import { NextRequest, NextResponse } from "next/server";
import { createPartFromBase64 } from "@google/genai";
import { analyzeNutrition, GeminiError } from "@/lib/gemini";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Body must be multipart/form-data" },
      { status: 400 }
    );
  }

  const image = form.get("image");

  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json(
      { error: "An 'image' file field is required" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(image.type)) {
    return NextResponse.json(
      { error: `Unsupported image type '${image.type || "unknown"}'. Use ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `Image must be ${MAX_IMAGE_BYTES / 1024 / 1024}MB or smaller` },
      { status: 400 }
    );
  }

  // The SDK takes inline image data as base64, so encode server-side rather
  // than making the browser do it before upload.
  const base64 = Buffer.from(await image.arrayBuffer()).toString("base64");

  try {
    const analysis = await analyzeNutrition([
      "Identify the foods in this photo and estimate the nutrition for the " +
        "portions shown.",
      createPartFromBase64(base64, image.type),
    ]);
    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof GeminiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
