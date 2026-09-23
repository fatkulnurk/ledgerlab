import type { ReactNode } from "react";
import { cn } from "./cn";

export interface StatProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "positive" | "negative";
  className?: string;
}

/**
 * A single key figure. Deliberately has no icon: the label and the number are
 * the information. Numbers use tabular figures so columns line up.
 */
export function Stat({ label, value, hint, tone = "neutral", className }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <span
        className={cn(
          "text-2xl font-semibold tabular-nums",
          tone === "positive" && "text-emerald-700",
          tone === "negative" && "text-red-700",
          tone === "neutral" && "text-zinc-900",
        )}
      >
        {value}
      </span>
      {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
    </div>
  );
}
