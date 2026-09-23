import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "positive" | "negative" | "warning" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-700",
  positive: "bg-emerald-50 text-emerald-700",
  negative: "bg-red-50 text-red-700",
  warning: "bg-amber-50 text-amber-800",
  accent: "bg-indigo-50 text-indigo-700",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, children, ...rest }: BadgeProps) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
