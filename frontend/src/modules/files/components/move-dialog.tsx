"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/common/components/button";
import { filesService } from "../services/files.service";
import { fileKeys } from "../hooks/use-folder-contents";
import { FolderIcon } from "./file-type-icon";
import type { FolderItem } from "../types";

interface MoveDialogProps {
  readonly itemName: string;
  readonly itemId: string;
  readonly itemKind: "file" | "folder";
  readonly currentFolderId: string | null;
  readonly loading?: boolean;
  readonly onMove: (destinationId: string | null) => void;
  readonly onCancel: () => void;
}

/**
 * Keyboard-accessible destination picker.
 *
 * Drag-and-drop is the fast path, but it is unusable with a keyboard or a
 * screen reader, so every move is also reachable through this dialog from
 * the item's action menu. Browsing one level at a time keeps it simple and
 * avoids loading the whole tree up front.
 */
export function MoveDialog({
  itemName,
  itemId,
  itemKind,
  currentFolderId,
  loading = false,
  onMove,
  onCancel,
}: MoveDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  const { data, isPending } = useQuery({
    queryKey: fileKeys.contents(null),
    queryFn: ({ signal }) => filesService.listRoot(signal),
  });

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  // A folder can never be moved into itself, so it is not offered.
  const destinations = (data?.folders ?? []).filter(
    (folder: FolderItem) => !(itemKind === "folder" && folder.id === itemId),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-title"
        className="relative flex w-full max-w-sm flex-col rounded-2xl border border-border bg-surface p-6 shadow-xl"
      >
        <h2 id="move-title" className="text-base font-semibold text-foreground">
          Move &ldquo;{itemName}&rdquo;
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose where it should go.
        </p>

        <ul className="mt-4 flex max-h-64 flex-col gap-1 overflow-y-auto">
          <li>
            <button
              type="button"
              disabled={currentFolderId === null || loading}
              onClick={() => onMove(null)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface-muted disabled:opacity-40"
            >
              <span aria-hidden="true">🗂</span>
              All files (root)
              {currentFolderId === null && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Current
                </span>
              )}
            </button>
          </li>

          {isPending ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Loading…</li>
          ) : destinations.length === 0 ? (
            <li className="px-3 py-4 text-sm text-muted-foreground">
              No other folders yet. Create one first.
            </li>
          ) : (
            destinations.map((folder) => (
              <li key={folder.id}>
                <button
                  type="button"
                  disabled={currentFolderId === folder.id || loading}
                  onClick={() => onMove(folder.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface-muted disabled:opacity-40"
                >
                  <FolderIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{folder.name}</span>
                  {currentFolderId === folder.id && (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      Current
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="mt-5 flex justify-end">
          <Button ref={closeRef} variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
