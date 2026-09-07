import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "quiet";
type Size = "sm" | "md";

/* Every button in the app comes from here, so a change to focus, radius or
   disabled behaviour lands in one place instead of eleven. */
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ink text-inverse shadow-card hover:bg-ink-2 disabled:hover:bg-ink",
  secondary:
    "border border-rule-strong bg-surface text-ink hover:bg-hover disabled:hover:bg-surface",
  quiet: "text-ink-2 hover:bg-hover hover:text-ink disabled:hover:bg-transparent",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-[0.8125rem]",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
};

export default function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      {...props}
      className={`inline-flex shrink-0 items-center justify-center font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    />
  );
}
