const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Calories are always whole numbers with a thousands separator: 1,240. */
export function kcal(value: number): string {
  return whole.format(Math.round(value));
}

/** Macro grams keep one decimal only when the value is small enough to need
 *  it — "0.6 g" is meaningful, "31.4 g" is false precision. */
export function grams(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded < 10 && rounded % 1 !== 0 ? rounded.toFixed(1) : whole.format(rounded);
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
