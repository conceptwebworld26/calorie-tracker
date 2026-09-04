export type Food = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
};

export type LogEntry = Food & {
  logId: number;
  loggedAt: string;
};

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** What both AI lookup routes return. `items` are shaped like `Food`, so one
 *  can be POSTed straight to /api/log without translation. */
export type NutritionAnalysis = {
  items: Food[];
  total: MacroTotals;
  note?: string;
};
