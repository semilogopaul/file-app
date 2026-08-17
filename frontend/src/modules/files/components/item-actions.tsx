"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/common/utils/cn";

interface Action {
  readonly label: string;
  readonly onSelect: () => void;
  readonly destructive?: boolean;
}

const MENU_WIDTH = 176;
const ESTIMATED_ITEM_HEIGHT = 36;

/**
 * Per-item overflow menu.
 *
 * The menu is rendered through a portal onto document.body rather than
 * inline. In list view the rows sit inside a container with
 * `overflow-hidden` (which gives the list its rounded corners), and an
 * absolutely-positioned child of that container gets clipped - the last row's
 * menu was cut off. A portal escapes both the overflow and any ancestor
 * stacking context, so position is computed against the viewport instead.
 *
 * It also flips above the trigger when there is not enough room below, so
 * the last row in a long list opens upward rather than off-screen.
 */
export function ItemActions({
  actions,
  label,
}: {
  readonly actions: Action[];
  readonly label: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Layout effect so the position is set before paint - otherwise the menu
  // renders at 0,0 for a frame and visibly jumps.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const menuHeight = actions.length * ESTIMATED_ITEM_HEIGHT + 8;
    const spaceBelow = window.innerHeight - rect.bottom;

    setPosition({
      top:
        spaceBelow < menuHeight + 12
          ? rect.top - menuHeight - 4 // flip above
          : rect.bottom + 4,
      // Right-aligned to the trigger, clamped so it never leaves the viewport.
      left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
    });
  }, [open, actions.length]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    // A portalled menu does not move with the page, so close it rather than
    // leave it stranded beside the wrong row.
    const close = () => setOpen(false);

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
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

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
            className="fixed z-50 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg shadow-ink-900/10"
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
                    : "text-foreground hover:bg-surface-muted",
                )}
              >
                {action.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
