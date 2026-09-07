export type Food = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
};

/** Which part of the day an entry belongs to. */
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type LogEntry = Food & {
  logId: number;
  loggedAt: string;
  meal: MealType;
};

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** The day's targets. Same shape as `MacroTotals` so progress is a plain divide. */
export type Goals = MacroTotals;

/** What both AI lookup routes return. `items` are shaped like `Food`, so a
 *  confirmed item goes straight into the log without translation. */
export type NutritionAnalysis = {
  items: Food[];
  total: MacroTotals;
  note?: string;
};
