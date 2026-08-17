"use client";

import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/common/utils/cn";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label: string;
  /** Field-level validation message. Presence also drives the error styling. */
  readonly error?: string;
  readonly hint?: string;
}

/**
 * Labelled input with accessible error wiring.
 *
 * The label is a real <label htmlFor>, the error is linked through
 * aria-describedby and announced via role="alert", and aria-invalid marks
 * the field itself - so the failure is conveyed to a screen reader rather
 * than only by a red border.
 */
export function TextField({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>

      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [error ? errorId : null, hint ? hintId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={cn(
          "h-11 rounded-lg border bg-surface px-3 text-sm text-foreground",
          "placeholder:text-ink-400",
          "transition-colors focus:outline-none",
          error
            ? "border-danger focus-visible:outline-danger"
            : "border-border hover:border-ink-300",
          className,
        )}
        {...props}
      />

      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-xs text-danger"
        >
          {/* Icon as well as colour, so the error survives colour blindness
              and greyscale printing. */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M7 4v3.5M7 9.8v.2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
