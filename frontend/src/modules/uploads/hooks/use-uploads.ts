"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest, ApiError } from "@/common/utils/api-client";
import { fileKeys } from "@/modules/files/hooks/use-folder-contents";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const;

export type UploadStatus =
  | "validating"
  | "requesting"
  | "uploading"
  | "finalising"
  | "done"
  | "error";

export interface UploadTask {
  readonly id: string;
  readonly name: string;
  readonly sizeBytes: number;
  readonly status: UploadStatus;
  /** 0-100, driven by real XHR progress events. */
  readonly progress: number;
  readonly error?: string;
}

interface InitUploadResponse {
  readonly uploadId: string;
  readonly uploadUrl: string;
  readonly requiredHeaders: Record<string, string>;
}

/**
 * Validates a file before any network call, so the user is told a file is
 * too large or the wrong type instantly rather than after a failed upload.
 * The server enforces both again - this is UX, not security.
 */
function validate(file: File): string | null {
  if (file.size === 0) {
    return "This file is empty";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Too large (${formatBytes(file.size)}). The limit is 10MB.`;
  }
  if (!ALLOWED_CONTENT_TYPES.includes(file.type as never)) {
    return "Only images and PDFs can be uploaded";
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Uploads a single file with real progress, using XMLHttpRequest.
 *
 * fetch() cannot report request upload progress in any browser today - its
 * streaming request bodies are not broadly supported - so XHR is the only
 * way to drive a genuine progress bar rather than an indeterminate spinner,
 * which the brief explicitly rules out.
 */
function putWithProgress({
  url,
  file,
  headers,
  onProgress,
  signal,
}: {
  url: string;
  file: File;
  headers: Record<string, string>;
  onProgress: (percent: number) => void;
  signal: AbortSignal;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);

    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else if (xhr.status === 403) {
        // The presigned URL signs Content-Type and an expiry, so a 403 here
        // means one of those no longer matches.
        reject(new Error("Upload was rejected. The link may have expired."));
      } else {
        reject(new Error(`Storage rejected the upload (${xhr.status})`));
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Connection lost during upload")),
    );
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

/**
 * Manages a queue of concurrent uploads.
 *
 * Each file runs its own independent init -> PUT -> complete chain, so one
 * failure never stops the others - a requirement of the brief.
 */
export function useUploads(folderId: string | null) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const queryClient = useQueryClient();
  const controllers = useRef(new Map<string, AbortController>());

  const patch = useCallback((id: string, changes: Partial<UploadTask>) => {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...changes } : task)),
    );
  }, []);

  const upload = useCallback(
    async (file: File, taskId: string) => {
      const controller = new AbortController();
      controllers.current.set(taskId, controller);

      try {
        const validationError = validate(file);
        if (validationError) {
          patch(taskId, { status: "error", error: validationError });
          return;
        }

        patch(taskId, { status: "requesting", progress: 0 });

        const init = await apiRequest<InitUploadResponse>("/v1/uploads/init", {
          method: "POST",
          body: {
            filename: file.name,
            sizeBytes: file.size,
            contentType: file.type,
            folderId,
          },
          signal: controller.signal,
        });

        patch(taskId, { status: "uploading" });

        await putWithProgress({
          url: init.uploadUrl,
          file,
          headers: init.requiredHeaders,
          onProgress: (progress) => patch(taskId, { progress }),
          signal: controller.signal,
        });

        patch(taskId, { status: "finalising", progress: 100 });

        await apiRequest(`/v1/uploads/${init.uploadId}/complete`, {
          method: "POST",
          signal: controller.signal,
        });

        patch(taskId, { status: "done", progress: 100 });

        // Refresh the listing so the new file appears without a reload.
        void queryClient.invalidateQueries({
          queryKey: fileKeys.contents(folderId),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setTasks((current) => current.filter((task) => task.id !== taskId));
          return;
        }

        patch(taskId, {
          status: "error",
          error:
            error instanceof ApiError || error instanceof Error
              ? error.message
              : "Upload failed",
        });
      } finally {
        controllers.current.delete(taskId);
      }
    },
    [folderId, patch, queryClient],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const newTasks = files.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        sizeBytes: file.size,
        status: "validating" as const,
        progress: 0,
      }));

      setTasks((current) => [...current, ...newTasks]);

      // Started in parallel on purpose: one slow or failing file must not
      // hold up the rest of the batch.
      newTasks.forEach((task, index) => void upload(files[index], task.id));
    },
    [upload],
  );

  const cancel = useCallback((taskId: string) => {
    controllers.current.get(taskId)?.abort();
  }, []);

  const dismiss = useCallback((taskId: string) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }, []);

  const clearFinished = useCallback(() => {
    setTasks((current) => current.filter((task) => task.status !== "done"));
  }, []);

  return { tasks, addFiles, cancel, dismiss, clearFinished };
}
