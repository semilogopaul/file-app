import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { activeShareLinksInclude, toFileResponse } from '../files/file.mapper';
import type { Folder } from '../../generated/prisma/client';
import type {
  BreadcrumbDto,
  FolderContentsDto,
  FolderResponseDto,
} from './dto/folder-response.dto';

/** Raw-query row shapes. Postgres returns snake_case column names. */
interface SubtreeTotalsRow {
  total_size: bigint | null;
  file_count: number;
}
interface DeletionCountsRow {
  folders_deleted: number;
  files_deleted: number;
}
interface AncestorRow {
  id: string;
  name: string;
}

function toFolderResponse(folder: Folder): FolderResponseDto {
  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async create({
    userId,
    name,
    parentId,
  }: {
    userId: string;
    name: string;
    parentId?: string | null;
  }): Promise<FolderResponseDto> {
    // A parent must exist and belong to this user, otherwise a guessed id
    // would let someone graft a folder into another account's tree.
    if (parentId) {
      await this.getOwnedFolder({ userId, folderId: parentId });
    }

    const folder = await this.prisma.folder.create({
      data: { name, ownerId: userId, parentId: parentId ?? null },
    });

    return toFolderResponse(folder);
  }

  /** Root listing: everything with no parent folder. */
  listRoot({ userId }: { userId: string }): Promise<FolderContentsDto> {
    return this.listContents({ userId, folder: null });
  }

  async listFolder({
    userId,
    folderId,
  }: {
    userId: string;
    folderId: string;
  }): Promise<FolderContentsDto> {
    const folder = await this.getOwnedFolder({ userId, folderId });
    return this.listContents({ userId, folder });
  }

  async rename({
    userId,
    folderId,
    name,
  }: {
    userId: string;
    folderId: string;
    name: string;
  }): Promise<FolderResponseDto> {
    // ownerId is part of the WHERE clause, so renaming another user's
    // folder updates zero rows rather than succeeding.
    const { count } = await this.prisma.folder.updateMany({
      where: { id: folderId, ownerId: userId, deletedAt: null },
      data: { name },
    });

    if (count === 0) {
      throw new NotFoundException('Folder not found');
    }

    return toFolderResponse(await this.getOwnedFolder({ userId, folderId }));
  }

  /**
   * Soft-deletes a folder and everything beneath it, at any depth.
   *
   * One statement, not an application-level tree walk. A recursive CTE
   * collects the subtree and two data-modifying CTEs mark the folders and
   * their files in the same snapshot, so the whole cascade is atomic - there
   * is no window where a child is deleted but its parent is not, and no
   * N+1 round trip per level.
   *
   * The anchor row carries `owner_id`, so the recursion can only ever walk
   * a tree this user owns.
   */
  async softDeleteRecursively({
    userId,
    folderId,
  }: {
    userId: string;
    folderId: string;
  }): Promise<{ foldersDeleted: number; filesDeleted: number }> {
    const now = new Date();

    const [result] = await this.prisma.$queryRaw<DeletionCountsRow[]>`
      WITH RECURSIVE subtree AS (
        SELECT id
          FROM folders
         WHERE id = ${folderId}::uuid
           AND owner_id = ${userId}::uuid
           AND deleted_at IS NULL
        UNION ALL
        SELECT child.id
          FROM folders child
          JOIN subtree ON child.parent_id = subtree.id
         WHERE child.deleted_at IS NULL
      ),
      deleted_folders AS (
        UPDATE folders
           SET deleted_at = ${now}, updated_at = ${now}
         WHERE id IN (SELECT id FROM subtree)
        RETURNING id
      ),
      deleted_files AS (
        UPDATE files
           SET deleted_at = ${now}, updated_at = ${now}
         WHERE folder_id IN (SELECT id FROM subtree)
           AND deleted_at IS NULL
        RETURNING id
      )
      SELECT
        (SELECT COUNT(*) FROM deleted_folders)::int AS folders_deleted,
        (SELECT COUNT(*) FROM deleted_files)::int   AS files_deleted
    `;

    // Zero folders touched means the anchor matched nothing: absent, owned
    // by someone else, or already deleted. One response for all three, so
    // this cannot be used to probe which folder ids exist.
    if (!result || result.folders_deleted === 0) {
      throw new NotFoundException('Folder not found');
    }

    return {
      foldersDeleted: result.folders_deleted,
      filesDeleted: result.files_deleted,
    };
  }

  private async listContents({
    userId,
    folder,
  }: {
    userId: string;
    folder: Folder | null;
  }): Promise<FolderContentsDto> {
    const parentId = folder?.id ?? null;

    const [folders, files, totals, breadcrumbs] = await Promise.all([
      this.prisma.folder.findMany({
        where: { ownerId: userId, parentId, deletedAt: null },
        orderBy: { name: 'asc' },
      }),
      this.prisma.file.findMany({
        // PENDING files are excluded: their bytes may not exist yet, so
        // showing them would mean rows that cannot be opened.
        where: {
          ownerId: userId,
          folderId: parentId,
          deletedAt: null,
          status: 'READY',
        },
        include: activeShareLinksInclude(),
        orderBy: { name: 'asc' },
      }),
      this.sumSubtree({ userId, folderId: parentId }),
      folder ? this.buildBreadcrumbs({ userId, folderId: folder.id }) : [],
    ]);

    return {
      folder: folder ? toFolderResponse(folder) : null,
      breadcrumbs,
      folders: folders.map(toFolderResponse),
      files: files.map(toFileResponse),
      totalSizeBytes: totals.totalSizeBytes,
      fileCount: totals.fileCount,
    };
  }

  /**
   * Recursive size rollup. Computed on demand rather than denormalised onto
   * the folder row: a stored counter would need updating on every upload,
   * delete and move, and any missed path leaves a permanently wrong number.
   */
  private async sumSubtree({
    userId,
    folderId,
  }: {
    userId: string;
    folderId: string | null;
  }): Promise<{ totalSizeBytes: number; fileCount: number }> {
    const rows = folderId
      ? await this.prisma.$queryRaw<SubtreeTotalsRow[]>`
          WITH RECURSIVE subtree AS (
            SELECT id
              FROM folders
             WHERE id = ${folderId}::uuid
               AND owner_id = ${userId}::uuid
               AND deleted_at IS NULL
            UNION ALL
            SELECT child.id
              FROM folders child
              JOIN subtree ON child.parent_id = subtree.id
             WHERE child.deleted_at IS NULL
          )
          SELECT COALESCE(SUM(size_bytes), 0)::bigint AS total_size,
                 COUNT(*)::int                        AS file_count
            FROM files
           WHERE folder_id IN (SELECT id FROM subtree)
             AND deleted_at IS NULL
             AND status = 'READY'
        `
      : // At the root the "subtree" is the whole account, so no recursion
        // is needed - just every non-deleted file the user owns.
        await this.prisma.$queryRaw<SubtreeTotalsRow[]>`
          SELECT COALESCE(SUM(size_bytes), 0)::bigint AS total_size,
                 COUNT(*)::int                        AS file_count
            FROM files
           WHERE owner_id = ${userId}::uuid
             AND deleted_at IS NULL
             AND status = 'READY'
        `;

    const row = rows[0];

    return {
      // Postgres SUM over bigint returns BigInt, which JSON.stringify
      // refuses to serialise. Safe to narrow: every file is capped at 10MB,
      // so a total would need ~900 million files to exceed Number's exact
      // integer range.
      totalSizeBytes: Number(row?.total_size ?? 0),
      fileCount: row?.file_count ?? 0,
    };
  }

  /**
   * Walks parent links upward to build the breadcrumb trail. Same recursive
   * CTE shape as the subtree queries, just following the edge in the other
   * direction, so it costs one query regardless of depth.
   */
  private async buildBreadcrumbs({
    userId,
    folderId,
  }: {
    userId: string;
    folderId: string;
  }): Promise<BreadcrumbDto[]> {
    const rows = await this.prisma.$queryRaw<AncestorRow[]>`
      WITH RECURSIVE ancestors AS (
        SELECT id, name, parent_id, 0 AS depth
          FROM folders
         WHERE id = ${folderId}::uuid
           AND owner_id = ${userId}::uuid
           AND deleted_at IS NULL
        UNION ALL
        SELECT parent.id, parent.name, parent.parent_id, ancestors.depth + 1
          FROM folders parent
          JOIN ancestors ON parent.id = ancestors.parent_id
         WHERE parent.deleted_at IS NULL
      )
      SELECT id, name FROM ancestors ORDER BY depth DESC
    `;

    return rows.map((row) => ({ id: row.id, name: row.name }));
  }

  /**
   * Central ownership gate. Scoping by ownerId in the WHERE clause - rather
   * than fetching then comparing - means a missed check cannot silently
   * return another user's folder.
   */
  private async getOwnedFolder({
    userId,
    folderId,
  }: {
    userId: string;
    folderId: string;
  }): Promise<Folder> {
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, ownerId: userId, deletedAt: null },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    return folder;
  }
}
