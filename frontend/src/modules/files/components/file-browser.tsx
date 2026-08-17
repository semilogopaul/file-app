"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/common/components/button";
import { EmptyState } from "@/common/components/empty-state";
import {
  EmptyFolderIllustration,
  ErrorIllustration,
  UploadIllustration,
} from "@/common/components/illustrations/spot-illustrations";
import { cn } from "@/common/utils/cn";
import { ApiError } from "@/common/utils/api-client";
import { formatBytes } from "@/modules/uploads/hooks/use-uploads";
import { UploadDropzone } from "@/modules/uploads/components/upload-dropzone";
import {
  useCreateFolder,
  useDeleteItem,
  useFolderContents,
  useRenameFile,
  useRenameFolder,
} from "../hooks/use-folder-contents";
import { filesService } from "../services/files.service";
import { FileIcon, FolderIcon } from "./file-type-icon";
import { InlineRename } from "./inline-rename";
import { ItemActions } from "./item-actions";
import { ConfirmDialog } from "./confirm-dialog";
import { ShareButton } from "@/modules/sharing/components/share-button";
import type { FileItem } from "../types";

type ViewMode = "grid" | "list";
type PendingDelete = { id: string; name: string; kind: "file" | "folder" };

export function FileBrowser({ folderId }: { readonly folderId: string | null }) {
  const router = useRouter();
  const { data, isPending, isError, error, refetch } = useFolderContents(folderId);

  const [view, setView] = useState<ViewMode>("grid");
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const createFolder = useCreateFolder(folderId);
  const renameFolder = useRenameFolder(folderId);
  const renameFile = useRenameFile(folderId);
  const deleteItem = useDeleteItem();

  if (isPending) {
    return <BrowserSkeleton />;
  }

  if (isError) {
    const isMissing = error instanceof ApiError && error.isNotFound;
    return (
      <EmptyState
        illustration={<ErrorIllustration />}
        title={isMissing ? "This folder no longer exists" : "Couldn't load your files"}
        description={
          isMissing
            ? "It may have been deleted from another tab or device."
            : error instanceof Error
              ? error.message
              : "Something went wrong."
        }
        action={
          isMissing ? (
            <Link href="/files">
              <Button>Back to all files</Button>
            </Link>
          ) : (
            <Button onClick={() => void refetch()}>Try again</Button>
          )
        }
      />
    );
  }

  const { folders, files, breadcrumbs, totalSizeBytes, fileCount } = data;
  const isEmpty = folders.length === 0 && files.length === 0;

  const openFile = async (file: FileItem) => {
    try {
      // Fetched on demand so the signed URL is always fresh rather than
      // having gone stale while the listing sat open.
      const target = await filesService.getDownloadUrl(
        file.id,
        file.contentType.startsWith("image/"),
      );
      window.open(target.url, "_blank", "noopener,noreferrer");
    } catch {
      // Non-fatal: the row stays put and the user can retry.
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs breadcrumbs={breadcrumbs} />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {data.folder?.name ?? "All files"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fileCount === 0
              ? "No files yet"
              : `${fileCount} file${fileCount === 1 ? "" : "s"} · ${formatBytes(totalSizeBytes)}`}
            {folders.length > 0 && ` · ${folders.length} folder${folders.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ViewToggle value={view} onChange={setView} />
          <Button variant="secondary" size="sm" onClick={() => setCreating(true)}>
            + New folder
          </Button>
        </div>
      </header>

      <UploadDropzone folderId={folderId} />

      {creating && (
        <NewFolderRow
          onCommit={(name) => {
            createFolder.mutate(name);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {isEmpty && !creating ? (
        <EmptyState
          illustration={
            folderId ? <EmptyFolderIllustration /> : <UploadIllustration />
          }
          title={folderId ? "This folder is empty" : "No files yet"}
          description={
            folderId
              ? "Drop files above to add them here, or create a folder to organise further."
              : "Drag files onto the area above to upload your first one. Images and PDFs, up to 10MB each."
          }
          action={
            <Button variant="secondary" onClick={() => setCreating(true)}>
              + New folder
            </Button>
          }
        />
      ) : (
        <div
          className={cn(
            view === "grid"
              ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border",
          )}
        >
          {folders.map((folder) => (
            <ItemCard
              key={folder.id}
              view={view}
              icon={<FolderIcon className="h-6 w-6" />}
              name={folder.name}
              meta="Folder"
              isRenaming={renamingId === folder.id}
              // An optimistic row has a placeholder id, so opening it would
              // 404. It is shown but not yet navigable.
              disabled={folder.id.startsWith("optimistic-")}
              onOpen={() => router.push(`/files/${folder.id}`)}
              onStartRename={() => setRenamingId(folder.id)}
              onRename={(name) => {
                renameFolder.mutate({ id: folder.id, name });
                setRenamingId(null);
              }}
              onCancelRename={() => setRenamingId(null)}
              onDelete={() =>
                setPendingDelete({
                  id: folder.id,
                  name: folder.name,
                  kind: "folder",
                })
              }
            />
          ))}

          {files.map((file) => (
            <ItemCard
              key={file.id}
              view={view}
              icon={<FileIcon contentType={file.contentType} className="h-6 w-6" />}
              name={file.name}
              meta={`${formatBytes(file.sizeBytes)} · ${formatDate(file.updatedAt)}`}
              badge={file.hasActiveShare ? <SharedBadge /> : undefined}
              isRenaming={renamingId === file.id}
              onOpen={() => void openFile(file)}
              onStartRename={() => setRenamingId(file.id)}
              onRename={(name) => {
                renameFile.mutate({ id: file.id, name });
                setRenamingId(null);
              }}
              onCancelRename={() => setRenamingId(null)}
              onDelete={() =>
                setPendingDelete({ id: file.id, name: file.name, kind: "file" })
              }
              extraActions={<ShareButton file={file} folderId={folderId} />}
            />
          ))}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete this ${pendingDelete.kind}?`}
          itemName={pendingDelete.name}
          description={
            pendingDelete.kind === "folder"
              ? "This folder and everything inside it will be removed from your files."
              : "This file will be removed from your files."
          }
          confirmLabel="Delete"
          loading={deleteItem.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() =>
            deleteItem.mutate(
              { id: pendingDelete.id, kind: pendingDelete.kind },
              { onSettled: () => setPendingDelete(null) },
            )
          }
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ parts */

function Breadcrumbs({
  breadcrumbs,
}: {
  readonly breadcrumbs: { id: string; name: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        <li>
          <Link
            href="/files"
            className="rounded px-1.5 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            All files
          </Link>
        </li>
        {breadcrumbs.map((crumb, index) => {
          const isCurrent = index === breadcrumbs.length - 1;
          return (
            <li key={crumb.id} className="flex items-center gap-1">
              <span aria-hidden="true" className="text-muted-foreground/60">
                /
              </span>
              {isCurrent ? (
                // aria-current marks position for screen readers; the last
                // crumb is not a link because it goes nowhere.
                <span
                  aria-current="page"
                  className="rounded px-1.5 py-0.5 font-medium text-foreground"
                >
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={`/files/${crumb.id}`}
                  className="rounded px-1.5 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  readonly value: ViewMode;
  readonly onChange: (value: ViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="View mode"
      className="flex rounded-lg border border-border p-0.5"
    >
      {(["grid", "list"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
            value === mode
              ? "bg-brand-surface text-brand-on-surface"
              : "text-ink-500 hover:text-foreground",
          )}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}

interface ItemCardProps {
  readonly view: ViewMode;
  readonly icon: React.ReactNode;
  readonly name: string;
  readonly meta: string;
  readonly badge?: React.ReactNode;
  readonly isRenaming: boolean;
  readonly disabled?: boolean;
  readonly onOpen: () => void;
  readonly onStartRename: () => void;
  readonly onRename: (name: string) => void;
  readonly onCancelRename: () => void;
  readonly onDelete: () => void;
  readonly extraActions?: React.ReactNode;
}

function ItemCard({
  view,
  icon,
  name,
  meta,
  badge,
  isRenaming,
  disabled = false,
  onOpen,
  onStartRename,
  onRename,
  onCancelRename,
  onDelete,
  extraActions,
}: ItemCardProps) {
  return (
    <div
      // A real button would swallow the nested action buttons, so this is a
      // div with an explicit role, tabIndex and key handling instead - which
      // keeps it reachable and operable from the keyboard.
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      onDoubleClick={() => !disabled && onStartRename()}
      onClick={() => !disabled && !isRenaming && onOpen()}
      onKeyDown={(event) => {
        if (disabled || isRenaming) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        } else if (event.key === "F2") {
          event.preventDefault();
          onStartRename();
        }
      }}
      className={cn(
        "group flex cursor-pointer items-center gap-3 bg-surface transition-colors",
        view === "grid"
          ? "rounded-xl border border-border p-4 hover:border-brand-300"
          : "px-4 py-3 hover:bg-surface-muted",
        disabled && "cursor-default opacity-60",
      )}
    >
      <span className="shrink-0">{icon}</span>

      <span className="min-w-0 flex-1">
        {isRenaming ? (
          <InlineRename value={name} onCommit={onRename} onCancel={onCancelRename} />
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium text-foreground">
                {name}
              </span>
              {badge}
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {meta}
            </span>
          </>
        )}
      </span>

      {!isRenaming && (
        <span className="flex shrink-0 items-center gap-1">
          {extraActions}
          <ItemActions
            label={name}
            actions={[
              { label: "Rename", onSelect: onStartRename },
              { label: "Delete", onSelect: onDelete, destructive: true },
            ]}
          />
        </span>
      )}
    </div>
  );
}

function SharedBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-surface px-1.5 py-0.5 text-[10px] font-medium text-brand-700"
      // Colour alone would not convey this; the text does.
      title="This file has an active share link"
    >
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path
          d="M5 7a2.5 2.5 0 0 0 3.5 0l1.8-1.8A2.5 2.5 0 0 0 6.8 1.7L5.9 2.6M7 5a2.5 2.5 0 0 0-3.5 0L1.7 6.8a2.5 2.5 0 0 0 3.5 3.5l.9-.9"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
      Shared
    </span>
  );
}

function NewFolderRow({
  onCommit,
  onCancel,
}: {
  readonly onCommit: (name: string) => void;
  readonly onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-300 bg-brand-surface/50 p-4">
      <FolderIcon className="h-6 w-6 shrink-0" />
      <div className="min-w-0 flex-1">
        <InlineRename value="Untitled folder" onCommit={onCommit} onCancel={onCancel} />
      </div>
    </div>
  );
}

function BrowserSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading files">
      <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
      <div className="h-7 w-48 animate-pulse rounded bg-surface-muted" />
      <div className="h-28 animate-pulse rounded-xl bg-surface-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-[72px] animate-pulse rounded-xl bg-surface-muted"
          />
        ))}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
