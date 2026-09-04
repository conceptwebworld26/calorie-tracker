import { GoogleGenAI, Type, type Part } from "@google/genai";
import { Food, MacroTotals, NutritionAnalysis } from "@/lib/types";

// gemini-2.5-flash-lite still appears in models.list() but rejects
// generateContent with "no longer available to new users", naming
// gemini-3.5-flash-lite as its replacement. Override via .env if that changes.
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

/** Thrown for anything the caller should surface as a specific HTTP status. */
export class GeminiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "GeminiError";
  }
}

const globalForGenAI = globalThis as unknown as { genAI?: GoogleGenAI };

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY is not set in .env", 500);
  }

  const genAI = globalForGenAI.genAI ?? new GoogleGenAI({ apiKey });
  if (process.env.NODE_ENV !== "production") {
    globalForGenAI.genAI = genAI;
  }
  return genAI;
}

/**
 * Forces Gemini to answer as JSON in exactly this shape, so the response can be
 * parsed directly instead of being fished out of a markdown code fence.
 *
 * `total` is deliberately absent — it's summed from `items` on our side.
 */
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      description: "One entry per distinct food in the meal.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "Short food name, e.g. 'Grilled Chicken Breast'.",
          },
          servingSize: {
            type: Type.STRING,
            description:
              "The portion these numbers describe, e.g. '100g' or '1 cup'.",
          },
          calories: { type: Type.NUMBER, description: "kcal for that portion." },
          protein: { type: Type.NUMBER, description: "Grams of protein." },
          carbs: { type: Type.NUMBER, description: "Grams of carbohydrate." },
          fat: { type: Type.NUMBER, description: "Grams of fat." },
        },
        required: ["name", "servingSize", "calories", "protein", "carbs", "fat"],
      },
    },
    note: {
      type: Type.STRING,
      description:
        "One short sentence naming the main assumption behind the estimate, " +
        "e.g. cooking method or an unstated portion size. Empty if none.",
    },
  },
  required: ["items"],
};

const SYSTEM_INSTRUCTION = `You are a nutrition estimator for a calorie tracking app.

Break the meal into its distinct foods and give per-food nutrition for the
portion actually described or visible. Rules:

- One item per distinct food. Split composite dishes into components only when
  they are separable (chicken / rice / salad), not when they are a single dish
  (lasagna stays one item).
- Estimate the portion shown or described. If no portion is given, assume one
  typical serving and say so in the note.
- Use standard reference values (USDA-style) for the food and portion.
- Numbers only, in grams for macros and kcal for calories. Never return ranges,
  units, or text inside a number field.
- If the input is not food at all, return an empty items array and explain in
  the note.`;

/** Shape Gemini is constrained to; `id` is assigned by us afterwards. */
type RawItem = Omit<Food, "id">;

function round(n: number) {
  return Math.round(n * 10) / 10;
}

function sumTotals(items: Food[]): MacroTotals {
  const total = items.reduce<MacroTotals>(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    calories: Math.round(total.calories),
    protein: round(total.protein),
    carbs: round(total.carbs),
    fat: round(total.fat),
  };
}

function isValidItem(item: unknown): item is RawItem {
  const i = item as RawItem;
  return (
    !!i &&
    typeof i.name === "string" &&
    i.name.trim() !== "" &&
    typeof i.servingSize === "string" &&
    Number.isFinite(i.calories) &&
    Number.isFinite(i.protein) &&
    Number.isFinite(i.carbs) &&
    Number.isFinite(i.fat)
  );
}

/**
 * Sends text and/or image parts to Gemini and returns validated nutrition data.
 * Both /api/analyze routes are thin wrappers over this — they differ only in
 * the parts they pass in.
 */
export async function analyzeNutrition(
  input: Array<Part | string>
): Promise<NutritionAnalysis> {
  const parts: Part[] = input.map((p) => (typeof p === "string" ? { text: p } : p));

  let response;
  try {
    response = await client().models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema,
        // Nutrition lookup should be repeatable, not creative.
        temperature: 0.2,
      },
    });
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    throw new GeminiError(
      `Gemini request failed: ${error instanceof Error ? error.message : "unknown error"}`,
      502
    );
  }

  const text = response.text;
  if (!text) {
    throw new GeminiError("Gemini returned an empty response", 502);
  }

  let parsed: { items?: unknown; note?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiError("Gemini returned malformed JSON", 502);
  }

  // The schema makes this unlikely, but a bad item would otherwise reach the
  // client as NaN totals, so drop anything that isn't fully numeric.
  const items: Food[] = (Array.isArray(parsed.items) ? parsed.items : [])
    .filter(isValidItem)
    .map((item, index) => ({
      // `ai-` prefix keeps these from colliding with catalog ids in lib/foods.ts.
      id: `ai-${index + 1}`,
      name: item.name.trim(),
      servingSize: item.servingSize.trim(),
      calories: Math.round(item.calories),
      protein: round(item.protein),
      carbs: round(item.carbs),
      fat: round(item.fat),
    }));

  const note = typeof parsed.note === "string" ? parsed.note.trim() : "";

  return {
    items,
    total: sumTotals(items),
    ...(note ? { note } : {}),
  };
}
