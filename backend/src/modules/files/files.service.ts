import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { activeShareLinksInclude, toFileResponse } from './file.mapper';
import type { FileResponseDto } from '../uploads/dto/upload-response.dto';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findOne({
    userId,
    fileId,
  }: {
    userId: string;
    fileId: string;
  }): Promise<FileResponseDto> {
    return toFileResponse(await this.getOwnedFile({ userId, fileId }));
  }

  /**
   * Rename and/or move a file.
   *
   * Only metadata changes - the storage key is immutable, so a move never
   * touches object storage, never re-uploads bytes, and never invalidates
   * an existing share link.
   */
  async update({
    userId,
    fileId,
    name,
    folderId,
    isMove,
  }: {
    userId: string;
    fileId: string;
    name?: string;
    folderId?: string | null;
    isMove: boolean;
  }): Promise<FileResponseDto> {
    if (isMove && folderId) {
      // The destination must exist and belong to this user, or a guessed id
      // would let someone file their upload into another account's folder.
      const folder = await this.prisma.folder.findFirst({
        where: { id: folderId, ownerId: userId, deletedAt: null },
        select: { id: true },
      });

      if (!folder) {
        throw new NotFoundException('Destination folder not found');
      }
    }

    // ownerId in the WHERE clause, so another user's file updates zero rows.
    const { count } = await this.prisma.file.updateMany({
      where: { id: fileId, ownerId: userId, deletedAt: null },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(isMove ? { folderId: folderId ?? null } : {}),
      },
    });

    if (count === 0) {
      throw new NotFoundException('File not found');
    }

    return toFileResponse(await this.getOwnedFile({ userId, fileId }));
  }

  /**
   * Soft delete: the row is marked, the object stays in storage.
   *
   * The brief asks for exactly this - "mark deleted, do not remove from
   * storage" - so recovery stays possible. Every listing query filters on
   * `deletedAt: null`, so the file disappears from the UI immediately.
   *
   * Uses updateMany rather than update so the owner check is part of the
   * WHERE clause: a mismatched owner updates zero rows instead of throwing
   * a Prisma error, and cannot delete someone else's file.
   */
  async softDelete({
    userId,
    fileId,
  }: {
    userId: string;
    fileId: string;
  }): Promise<void> {
    const { count } = await this.prisma.file.updateMany({
      where: { id: fileId, ownerId: userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (count === 0) {
      // Covers "does not exist", "belongs to someone else" and "already
      // deleted" with one response, so the endpoint cannot be used to probe
      // which file ids exist.
      throw new NotFoundException('File not found');
    }
  }

  /**
   * Issues a short-lived presigned GET so the browser downloads straight
   * from storage - the file bytes never pass through this API.
   */
  async createDownloadUrl({
    userId,
    fileId,
    inline = false,
  }: {
    userId: string;
    fileId: string;
    inline?: boolean;
  }): Promise<{ url: string; name: string; contentType: string }> {
    const file = await this.getOwnedFile({ userId, fileId });

    const url = await this.storage.createDownloadUrl({
      key: file.storageKey,
      downloadName: file.name,
      inline,
    });

    return { url, name: file.name, contentType: file.contentType };
  }

  /**
   * Central ownership gate. Scoping by ownerId in the WHERE clause - rather
   * than fetching then comparing in code - means a forgotten check cannot
   * silently return another user's row.
   *
   * PENDING files are excluded: their bytes may not exist yet.
   */
  private async getOwnedFile({
    userId,
    fileId,
  }: {
    userId: string;
    fileId: string;
  }) {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        ownerId: userId,
        deletedAt: null,
        status: 'READY',
      },
      include: activeShareLinksInclude(),
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }
}
