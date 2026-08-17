"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { filesService } from "@/modules/files/services/files.service";
import { fileKeys } from "@/modules/files/hooks/use-folder-contents";
import { cn } from "@/common/utils/cn";
import type { FileItem } from "@/modules/files/types";

type Feedback = { kind: "copied" | "revoked" | "error"; message: string };

/**
 * Creates a share link and puts it on the clipboard in one action.
 *
 * The clipboard write happens in the same user-gesture-initiated handler as
 * the request; browsers reject navigator.clipboard calls that are too far
 * removed from a user gesture. When it is refused anyway (Safari is strict,
 * and it needs a secure context) the URL is surfaced so the link is never
 * simply lost.
 */
export function ShareButton({
  file,
  folderId,
}: {
  readonly file: FileItem;
  readonly folderId: string | null;
}) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: fileKeys.contents(folderId) });

  const share = useMutation({
    mutationFn: () => filesService.createShareLink(file.id),
    onSuccess: async (link) => {
      try {
        await navigator.clipboard.writeText(link.url);
        setFeedback({ kind: "copied", message: "Link copied" });
      } catch {
        setFallbackUrl(link.url);
        setFeedback({ kind: "error", message: "Copy it manually" });
      }
      invalidate();
      window.setTimeout(() => setFeedback(null), 2500);
    },
    onError: () => {
      setFeedback({ kind: "error", message: "Couldn't create link" });
      window.setTimeout(() => setFeedback(null), 2500);
    },
  });

  const revoke = useMutation({
    mutationFn: () => filesService.revokeShareLink(file.id),
    onSuccess: () => {
      setFeedback({ kind: "revoked", message: "Sharing stopped" });
      setFallbackUrl(null);
      invalidate();
      window.setTimeout(() => setFeedback(null), 2500);
    },
  });

  const busy = share.isPending || revoke.isPending;

  return (
    <span className="relative">
      <button
        type="button"
        disabled={busy}
        onClick={(event) => {
          event.stopPropagation();
          if (file.hasActiveShare) {
            revoke.mutate();
          } else {
            share.mutate();
          }
        }}
        aria-label={
          file.hasActiveShare
            ? `Stop sharing ${file.name}`
            : `Create a share link for ${file.name}`
        }
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50",
          file.hasActiveShare
            ? "text-brand-600 hover:bg-brand-50"
            : "text-ink-500 hover:bg-surface-muted hover:text-foreground",
        )}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M6.5 9.5a3 3 0 0 0 4.2 0l2.2-2.2a3 3 0 0 0-4.2-4.2l-1 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M9.5 6.5a3 3 0 0 0-4.2 0L3.1 8.7a3 3 0 0 0 4.2 4.2l1-1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {feedback && (
        <span
          role="status"
          className={cn(
            "absolute right-0 top-9 z-30 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium shadow-sm",
            feedback.kind === "error"
              ? "bg-danger text-white"
              : "bg-ink-800 text-white",
          )}
        >
          {feedback.message}
        </span>
      )}

      {fallbackUrl && (
        <span
          className="absolute right-0 top-9 z-30 flex w-72 flex-col gap-1 rounded-lg border border-border bg-surface p-2 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <span className="text-[11px] text-muted-foreground">
            Copy this link:
          </span>
          <input
            readOnly
            value={fallbackUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded border border-border bg-surface-muted px-2 py-1 font-mono text-[11px] text-foreground"
          />
        </span>
      )}
    </span>
  );
}
