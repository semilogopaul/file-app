"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { cn } from "@/common/utils/cn";
import {
  ALLOWED_CONTENT_TYPES,
  formatBytes,
  useUploads,
  type UploadTask,
} from "../hooks/use-uploads";

const STATUS_LABEL: Record<UploadTask["status"], string> = {
  validating: "Checking…",
  requesting: "Preparing…",
  uploading: "Uploading",
  finalising: "Finishing…",
  done: "Uploaded",
  error: "Failed",
};

export function UploadDropzone({ folderId }: { readonly folderId: string | null }) {
  const { tasks, addFiles, cancel, dismiss, clearFinished } = useUploads(folderId);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // dragenter/dragleave fire for every child element, so a plain boolean
  // flickers as the pointer moves across the zone. Counting entries and
  // exits keeps the highlight stable.
  const dragDepth = useRef(0);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);

      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) addFiles(files);
    },
    [addFiles],
  );

  const activeCount = tasks.filter(
    (task) => task.status !== "done" && task.status !== "error",
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) setIsDragging(false);
        }}
        // Without preventDefault on dragover the browser opens the file
        // instead of firing our drop handler.
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className={cn(
          "rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          isDragging
            ? "border-brand-500 bg-brand-50"
            : "border-border bg-surface-muted/40 hover:border-brand-300",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_CONTENT_TYPES.join(",")}
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) addFiles(files);
            // Reset so re-picking the same file fires change again.
            event.target.value = "";
          }}
        />

        <p className="text-sm text-foreground">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-medium text-brand-600 underline-offset-4 hover:underline"
          >
            Choose files
          </button>{" "}
          <span className="text-muted-foreground">or drag them here</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Images and PDFs · up to 10MB each
        </p>
      </div>

      {tasks.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
          <div className="flex items-center justify-between">
            <p
              className="text-xs font-medium text-foreground"
              // Progress is announced politely so a screen reader user hears
              // the batch finish without being interrupted mid-sentence.
              aria-live="polite"
            >
              {activeCount > 0
                ? `Uploading ${activeCount} file${activeCount === 1 ? "" : "s"}…`
                : "All uploads finished"}
            </p>
            {activeCount === 0 && (
              <button
                type="button"
                onClick={clearFinished}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <li key={task.id}>
                <UploadRow
                  task={task}
                  onCancel={() => cancel(task.id)}
                  onDismiss={() => dismiss(task.id)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function UploadRow({
  task,
  onCancel,
  onDismiss,
}: {
  readonly task: UploadTask;
  readonly onCancel: () => void;
  readonly onDismiss: () => void;
}) {
  const isActive = task.status !== "done" && task.status !== "error";

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-foreground">
            {task.name}
          </span>
          <span
            className={cn(
              "shrink-0 text-xs",
              task.status === "error" ? "text-danger" : "text-muted-foreground",
            )}
          >
            {task.status === "uploading"
              ? `${task.progress}%`
              : STATUS_LABEL[task.status]}
          </span>
        </div>

        {task.status === "error" ? (
          // The failure replaces the bar rather than sitting beside it, so
          // it cannot be mistaken for a stalled upload.
          <p role="alert" className="mt-1 text-xs text-danger">
            {task.error}
          </p>
        ) : (
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-valuenow={task.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Upload progress for ${task.name}`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-200",
                task.status === "done" ? "bg-success" : "bg-brand-500",
              )}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        )}

        {task.status !== "error" && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatBytes(task.sizeBytes)}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={isActive ? onCancel : onDismiss}
        className="shrink-0 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        {isActive ? "Cancel" : "Dismiss"}
      </button>
    </div>
  );
}
