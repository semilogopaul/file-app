import { cn } from "@/common/utils/cn";

interface LogoProps {
  readonly className?: string;
  readonly size?: "sm" | "md" | "lg";
  /** Renders the mark alone, for tight spaces like a mobile header. */
  readonly markOnly?: boolean;
}

const SIZES = {
  sm: { text: "text-lg", mark: "h-6 w-6", dot: "h-1.5 w-1.5" },
  md: { text: "text-2xl", mark: "h-8 w-8", dot: "h-2 w-2" },
  lg: { text: "text-4xl", mark: "h-12 w-12", dot: "h-3 w-3" },
} as const;

/**
 * The istore wordmark: a lowercase "i" in brand pink followed by "store" in
 * ink.
 *
 * Set in the system font stack (SF on Apple platforms) rather than the body
 * face, so the mark reads as a logotype instead of just bold body text.
 * Tracking is tightened because SF Display is drawn loose at large sizes.
 */
export function Logo({ className, size = "md", markOnly = false }: LogoProps) {
  const s = SIZES[size];

  if (markOnly) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-xl bg-brand-600 font-logo font-semibold text-white",
          s.mark,
          className,
        )}
        aria-label="istore"
      >
        i
      </span>
    );
  }

  return (
    <span
      className={cn(
        "font-logo font-semibold tracking-[-0.03em] select-none",
        s.text,
        className,
      )}
    >
      {/* aria-hidden on the pieces + a label on the wrapper, so screen
          readers announce "istore" once rather than spelling it out. */}
      <span aria-hidden="true" className="text-brand-500">
        i
      </span>
      <span aria-hidden="true" className="text-foreground">
        store
      </span>
      <span className="sr-only">istore</span>
    </span>
  );
}
