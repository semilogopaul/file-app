import { apiRequest } from "@/common/utils/api-client";
import type {
  DownloadTarget,
  FileItem,
  FolderContents,
  FolderItem,
  ShareLink,
} from "../types";

/** Every network call the browser makes for files, folders and sharing. */
export const filesService = {
  listRoot(signal?: AbortSignal): Promise<FolderContents> {
    return apiRequest<FolderContents>("/v1/folders", { signal });
  },

  listFolder(folderId: string, signal?: AbortSignal): Promise<FolderContents> {
    return apiRequest<FolderContents>(`/v1/folders/${folderId}`, { signal });
  },

  createFolder(input: {
    name: string;
    parentId: string | null;
  }): Promise<FolderItem> {
    return apiRequest<FolderItem>("/v1/folders", {
      method: "POST",
      body: input,
    });
  },

  renameFolder(id: string, name: string): Promise<FolderItem> {
    return apiRequest<FolderItem>(`/v1/folders/${id}`, {
      method: "PATCH",
      body: { name },
    });
  },

  deleteFolder(id: string): Promise<void> {
    return apiRequest<void>(`/v1/folders/${id}`, { method: "DELETE" });
  },

  renameFile(id: string, name: string): Promise<FileItem> {
    return apiRequest<FileItem>(`/v1/files/${id}`, {
      method: "PATCH",
      body: { name },
    });
  },

  deleteFile(id: string): Promise<void> {
    return apiRequest<void>(`/v1/files/${id}`, { method: "DELETE" });
  },

  /** Short-lived presigned URL; fetched on demand rather than with the
   *  listing, so links cannot go stale sitting in a table. */
  getDownloadUrl(id: string, inline = false): Promise<DownloadTarget> {
    return apiRequest<DownloadTarget>(
      `/v1/files/${id}/download-url${inline ? "?inline=true" : ""}`,
    );
  },

  createShareLink(id: string): Promise<ShareLink> {
    return apiRequest<ShareLink>(`/v1/files/${id}/share`, { method: "POST" });
  },

  revokeShareLink(id: string): Promise<void> {
    return apiRequest<void>(`/v1/files/${id}/share`, { method: "DELETE" });
  },

  search(query: string, signal?: AbortSignal): Promise<FileItem[]> {
    return apiRequest<FileItem[]>(
      `/v1/search?q=${encodeURIComponent(query)}`,
      { signal },
    );
  },
};
