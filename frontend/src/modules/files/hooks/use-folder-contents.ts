"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { filesService } from "../services/files.service";
import type { FileItem, FolderContents, FolderItem } from "../types";

export const fileKeys = {
  all: ["files"] as const,
  contents: (folderId: string | null) =>
    ["files", "contents", folderId ?? "root"] as const,
  search: (query: string) => ["files", "search", query] as const,
};

export function useFolderContents(folderId: string | null) {
  return useQuery({
    queryKey: fileKeys.contents(folderId),
    queryFn: ({ signal }) =>
      folderId
        ? filesService.listFolder(folderId, signal)
        : filesService.listRoot(signal),
  });
}

/**
 * Optimistic create.
 *
 * The brief calls optimistic UI for non-destructive actions a plus, with the
 * hard requirement that errors roll back cleanly. The pattern below is the
 * one TanStack Query prescribes: cancel in-flight refetches so they cannot
 * overwrite the optimistic value, snapshot, apply, and restore the exact
 * snapshot on failure.
 */
export function useCreateFolder(parentId: string | null) {
  const queryClient = useQueryClient();
  const key = fileKeys.contents(parentId);

  return useMutation({
    mutationFn: (name: string) =>
      filesService.createFolder({ name, parentId }),

    onMutate: async (name: string) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FolderContents>(key);

      const optimistic: FolderItem = {
        // Marked so the row can be rendered as pending and, critically, so
        // it is never treated as a real id to navigate into.
        id: `optimistic-${Date.now()}`,
        name,
        parentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (previous) {
        queryClient.setQueryData<FolderContents>(key, {
          ...previous,
          folders: [...previous.folders, optimistic].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        });
      }

      return { previous };
    },

    onError: (_error, _name, context) => {
      // Restores the snapshot wholesale rather than trying to remove the
      // optimistic row, so concurrent edits cannot leave a half-state.
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useRenameFolder(currentFolderId: string | null) {
  const queryClient = useQueryClient();
  const key = fileKeys.contents(currentFolderId);

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      filesService.renameFolder(id, name),

    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FolderContents>(key);

      if (previous) {
        queryClient.setQueryData<FolderContents>(key, {
          ...previous,
          folders: previous.folders.map((folder) =>
            folder.id === id ? { ...folder, name } : folder,
          ),
        });
      }

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useRenameFile(currentFolderId: string | null) {
  const queryClient = useQueryClient();
  const key = fileKeys.contents(currentFolderId);

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      filesService.renameFile(id, name),

    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FolderContents>(key);

      if (previous) {
        queryClient.setQueryData<FolderContents>(key, {
          ...previous,
          files: previous.files.map((file) =>
            file.id === id ? { ...file, name } : file,
          ),
        });
      }

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/**
 * Deletes are NOT optimistic, deliberately.
 *
 * The brief asks for optimism on non-destructive actions specifically. If a
 * delete failed after the row had already vanished, the user would believe
 * something was gone that still exists - a worse outcome than a brief wait.
 *
 * Takes no folder id because a folder delete cascades server-side, so the
 * only safe invalidation is the whole file tree, not one listing.
 */
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: "file" | "folder" }) =>
      kind === "file"
        ? filesService.deleteFile(id)
        : filesService.deleteFolder(id),

    onSuccess: () => {
      // A folder delete cascades, so sibling caches may now be stale too.
      void queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
  });
}

/**
 * Moves a file or folder into another folder (null = the owner's root).
 *
 * Not optimistic: the item leaves the current view entirely, and the server
 * can legitimately refuse (moving a folder into its own subtree). Showing it
 * vanish and then reappear would be worse than a brief wait.
 */
export function useMoveItem() {
  const queryClient = useQueryClient();

  return useMutation<
    // The union is stated explicitly: moving a file resolves to a FileItem
    // and a folder to a FolderItem, which TypeScript cannot infer from the
    // conditional below.
    FileItem | FolderItem,
    Error,
    { id: string; kind: "file" | "folder"; destinationId: string | null }
  >({
    mutationFn: ({
      id,
      kind,
      destinationId,
    }: {
      id: string;
      kind: "file" | "folder";
      destinationId: string | null;
    }) =>
      kind === "file"
        ? filesService.moveFile(id, destinationId)
        : filesService.moveFolder(id, destinationId),

    onSuccess: () => {
      // Both the source and destination listings changed, and a folder move
      // shifts a whole subtree, so invalidate the tree rather than guess.
      void queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
  });
}
