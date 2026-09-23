import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  padded?: boolean;
}

/**
 * A single flat surface with a hairline border. Avoid nesting cards; if you
 * need grouping inside a card, use a heading and spacing instead.
 */
export function Card({
  title,
  description,
  actions,
  padded = true,
  className,
  children,
  ...rest
}: CardProps) {
  const hasHeader = Boolean(title || description || actions);
  return (
    <section {...rest} className={cn("rounded-lg border border-zinc-200 bg-white shadow-xs", className)}>
      {hasHeader ? (
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-3.5">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold text-zinc-900">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-sm text-zinc-500">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn(padded ? "p-5" : "")}>{children}</div>
    </section>
  );
}
