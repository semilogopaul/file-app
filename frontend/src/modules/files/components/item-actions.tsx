"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/common/utils/cn";

interface Action {
  readonly label: string;
  readonly onSelect: () => void;
  readonly destructive?: boolean;
}

/**
 * Per-item overflow menu.
 *
 * A real <button> trigger with aria-expanded/aria-haspopup, closing on
 * Escape and on outside click, so the menu is operable from the keyboard
 * rather than being a hover-only affordance.
 */
export function ItemActions({
  actions,
  label,
}: {
  readonly actions: Action[];
  readonly label: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="3" r="1.5" fill="currentColor" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="13" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-20 min-w-40 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg shadow-ink-900/5"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              role="menuitem"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                action.onSelect();
              }}
              className={cn(
                "flex w-full items-center px-3 py-2 text-left text-sm transition-colors",
                action.destructive
                  ? "text-danger hover:bg-danger/10"
                  : "text-ink-700 hover:bg-surface-muted dark:text-ink-200",
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
