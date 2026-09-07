import Meter from "./Meter";
import { grams } from "@/lib/format";

const DOT: Record<string, string> = {
  protein: "bg-protein",
  carbs: "bg-carbs",
  fat: "bg-fat",
};

export default function MacroRow({
  name,
  tone,
  value,
  goal,
}: {
  name: string;
  tone: "protein" | "carbs" | "fat";
  value: number;
  goal: number;
}) {
  return (
    <div className="grid grid-cols-[5.25rem_1fr_auto] items-center gap-3">
      <span className="flex items-center gap-2 text-sm text-ink-2">
        <span aria-hidden className={`size-2 rounded-full ${DOT[tone]}`} />
        {name}
      </span>
      <Meter
        value={value}
        max={goal}
        tone={tone}
        label={`${name} against goal`}
        valueText={`${grams(value)} of ${grams(goal)} grams`}
      />
      <span className="text-sm text-ink-2">
        <span className="font-medium text-ink">{grams(value)}</span>
        <span className="text-ink-3"> / {grams(goal)} g</span>
      </span>
    </div>
  );
}
