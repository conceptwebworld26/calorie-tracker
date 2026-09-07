type Tone = "good" | "warn" | "over" | "protein" | "carbs" | "fat";

/* Tailwind only emits classes it can see in the source, so tones map to
   literal strings rather than being interpolated. */
const FILL: Record<Tone, string> = {
  good: "bg-good",
  warn: "bg-warn",
  over: "bg-over",
  protein: "bg-protein",
  carbs: "bg-carbs",
  fat: "bg-fat",
};

/**
 * A single horizontal bar. The whole interface's status is carried by these,
 * at two sizes: one wide one for calories and three slim ones for macros.
 */
export default function Meter({
  value,
  max,
  tone,
  label,
  valueText,
  size = "sm",
}: {
  value: number;
  max: number;
  tone: Tone;
  label: string;
  valueText: string;
  size?: "sm" | "lg";
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuetext={valueText}
      className={`w-full overflow-hidden rounded-full bg-sunken ${
        size === "lg" ? "h-3" : "h-1.5"
      }`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${FILL[tone]}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
