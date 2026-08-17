export type FileStatus = "PENDING" | "READY";

export interface FileItem {
  readonly id: string;
  readonly name: string;
  readonly sizeBytes: number;
  readonly contentType: string;
  readonly status: FileStatus;
  readonly folderId: string | null;
  readonly hasThumbnail: boolean;
  readonly hasActiveShare: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FolderItem {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Breadcrumb {
  readonly id: string;
  readonly name: string;
}

/** Response shape shared by the root listing and any folder listing. */
export interface FolderContents {
  readonly folder: FolderItem | null;
  readonly breadcrumbs: Breadcrumb[];
  readonly folders: FolderItem[];
  readonly files: FileItem[];
  /** Recursive across all descendants, not just direct children. */
  readonly totalSizeBytes: number;
  readonly fileCount: number;
}

export interface DownloadTarget {
  readonly url: string;
  readonly name: string;
  readonly contentType: string;
}

export interface ShareLink {
  readonly token: string;
  readonly url: string;
  readonly expiresAt: string;
}
