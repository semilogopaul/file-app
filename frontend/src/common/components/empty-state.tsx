import type { ReactNode } from "react";

interface EmptyStateProps {
  readonly illustration: ReactNode;
  readonly title: string;
  readonly description: string;
  /** Every empty state offers a next action - the brief requires it, and a
   *  dead end is the worst thing to hand someone who is already stuck. */
  readonly action?: ReactNode;
}

export function EmptyState({
  illustration,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-44">{illustration}</div>
      <h2 className="mt-6 text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
