"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/**
 * Root error boundary (SOP Section 5: "a global error boundary is
 * mandatory"). Catches render/runtime errors anywhere below the root
 * layout. Message is deliberately generic - never surface raw error
 * internals to the user.
 */
export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Centralized hook for forwarding to an error-monitoring service
    // (Sentry, etc.) once one is wired up.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-foreground/70">
        We hit an unexpected problem. Please try again.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-2 rounded-lg border border-current px-5 py-2.5 text-sm font-medium"
      >
        Try again
      </button>
    </div>
  );
}
