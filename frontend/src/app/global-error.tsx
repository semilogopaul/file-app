"use client";

import { useEffect } from "react";

interface GlobalErrorPageProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/**
 * Last-resort boundary for errors thrown by the root layout itself, where
 * even fonts/providers may be unavailable - must render its own <html>/
 * <body> and stays dependency-free (inline styles, no CSS module, no
 * provider) on purpose.
 */
export default function GlobalError({ error, reset }: GlobalErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "24px",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h2>Something went wrong</h2>
          <p style={{ color: "#666", maxWidth: 440 }}>
            We hit an unexpected problem loading this page. Please try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 8,
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid currentColor",
              background: "transparent",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
