import type { FileResponseDto } from '../../uploads/dto/upload-response.dto';

export class FolderResponseDto {
  readonly id!: string;
  readonly name!: string;
  readonly parentId!: string | null;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
}

/** One hop of the root -> current path, for breadcrumb navigation. */
export class BreadcrumbDto {
  readonly id!: string;
  readonly name!: string;
}

/**
 * Shape returned by both GET /folders (root) and GET /folders/:id.
 *
 * Deliberately identical for both, with `folder: null` at the root, so the
 * frontend renders one component for every level instead of special-casing
 * the top.
 */
export class FolderContentsDto {
  /** null when listing the owner's root. */
  readonly folder!: FolderResponseDto | null;
  /** Root-first; empty at the root. */
  readonly breadcrumbs!: BreadcrumbDto[];
  readonly folders!: FolderResponseDto[];
  readonly files!: FileResponseDto[];
  /** Recursive total across every descendant, not just direct children. */
  readonly totalSizeBytes!: number;
  readonly fileCount!: number;
}
