import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/common/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: Variant;
  readonly size?: Size;
  readonly loading?: boolean;
  readonly children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  // brand-600 rather than the lighter signature pink: white text needs a
  // 4.5:1 background to meet AA, which the lighter steps do not reach.
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800",
  secondary:
    "bg-surface text-foreground border border-border hover:bg-surface-muted",
  ghost: "text-ink-600 hover:bg-surface-muted hover:text-foreground",
  danger: "bg-danger text-white hover:brightness-110 active:brightness-95",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      // Explicit, because a button inside a form defaults to type="submit"
      // and silently submits it.
      type={props.type ?? "button"}
      disabled={disabled ?? loading}
      // Tells assistive tech the control is working, rather than the
      // spinner being a purely visual cue.
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium",
        "transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6.5"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2.5"
      />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
