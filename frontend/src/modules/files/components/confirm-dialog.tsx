"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/common/components/button";

interface ConfirmDialogProps {
  readonly title: string;
  /** Names the exact item being deleted - the brief requires the
   *  confirmation to say what it is about to remove. */
  readonly itemName: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly loading?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmDialog({
  title,
  itemName,
  description,
  confirmLabel,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus the confirm button so the dialog is immediately keyboard
    // operable, and Escape always backs out.
    confirmRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl"
      >
        <h2
          id="confirm-title"
          className="text-base font-semibold text-foreground"
        >
          {title}
        </h2>

        <p id="confirm-description" className="mt-2 text-sm text-muted-foreground">
          {description}
        </p>

        <p className="mt-3 truncate rounded-lg bg-surface-muted px-3 py-2 text-sm font-medium text-foreground">
          {itemName}
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            ref={confirmRef}
            variant="danger"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
