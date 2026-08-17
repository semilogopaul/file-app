"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

interface InlineRenameProps {
  readonly value: string;
  readonly onCommit: (name: string) => void;
  readonly onCancel: () => void;
}

/**
 * In-place rename field, per the brief's "double-click to edit".
 *
 * Enter commits, Escape cancels, blur commits (matching Finder and Drive).
 * The filename stem is preselected rather than the whole string, so typing
 * replaces the name without destroying the extension.
 */
export function InlineRename({ value, onCommit, onCancel }: InlineRenameProps) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  // Guards against blur firing after Enter/Escape and committing twice.
  const settled = useRef(false);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.focus();
    const lastDot = value.lastIndexOf(".");
    input.setSelectionRange(0, lastDot > 0 ? lastDot : value.length);
  }, [value]);

  const commit = () => {
    if (settled.current) return;
    settled.current = true;

    const trimmed = draft.trim();
    // An empty or unchanged name is a no-op, not an error to shout about.
    if (!trimmed || trimmed === value) {
      onCancel();
      return;
    }
    onCommit(trimmed);
  };

  const cancel = () => {
    if (settled.current) return;
    settled.current = true;
    onCancel();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
    // Stops the row's own key handlers (navigate, delete) from firing while
    // the user is typing a name.
    event.stopPropagation();
  };

  return (
    <input
      ref={inputRef}
      value={draft}
      aria-label="New name"
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={commit}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      className="w-full rounded-md border border-brand-400 bg-surface px-2 py-1 text-sm text-foreground outline-none"
    />
  );
}
