import type { ReactNode } from "react";
import { Button, EmptyState } from "@ledgerlab/ui";

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 py-8 text-sm text-zinc-500">
      <span
        aria-hidden
        className="size-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600"
      />
      {label}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      title="Something went wrong"
      description={message}
      action={onRetry ? <Button onClick={onRetry}>Try again</Button> : undefined}
    />
  );
}

/** Render loading / error / empty / content with a consistent contract. */
export function Async<T>({
  loading,
  error,
  data,
  onRetry,
  empty,
  isEmpty,
  children,
}: {
  loading: boolean;
  error: string | undefined;
  data: T | undefined;
  onRetry?: () => void;
  /** Rendered when `isEmpty(data)` is true (a successful but empty result). */
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}) {
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={onRetry} />;
  if (data === undefined) return <ErrorBlock message="No data returned" onRetry={onRetry} />;
  if (empty && isEmpty?.(data)) return <>{empty}</>;
  return <>{children(data)}</>;
}
