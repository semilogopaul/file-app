import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  buildStorageKey,
  sanitiseFilename,
} from '../../common/utils/storage-key.util';
import { toFileResponse } from '../files/file.mapper';
import type {
  FileResponseDto,
  InitUploadResponseDto,
} from './dto/upload-response.dto';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Step 1 of the upload. Commits all the metadata the server controls -
   * owner, folder, storage key, declared size and type - before any bytes
   * exist, then hands back a presigned URL.
   *
   * Doing it in this order is what removes the init/complete race: the row
   * already carries its owner and folder, so /complete never has to trust
   * anything the client sends beyond the id. The row is PENDING until then,
   * and PENDING rows are excluded from every listing, so a half-finished
   * upload is invisible rather than a phantom entry.
   */
  async initUpload({
    userId,
    filename,
    sizeBytes,
    contentType,
    folderId,
  }: {
    userId: string;
    filename: string;
    sizeBytes: number;
    contentType: string;
    folderId?: string | null;
  }): Promise<InitUploadResponseDto> {
    const maxBytes = this.configService.getOrThrow<number>('uploads.maxBytes');
    const allowedContentTypes = this.configService.getOrThrow<
      readonly string[]
    >('uploads.allowedContentTypes');

    // Rejected before a URL is ever issued, so an oversized file never
    // begins uploading.
    if (sizeBytes > maxBytes) {
      throw new PayloadTooLargeException(
        `File exceeds the ${Math.floor(maxBytes / 1024 / 1024)}MB limit`,
      );
    }

    const normalisedContentType = contentType
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (!allowedContentTypes.includes(normalisedContentType)) {
      throw new UnsupportedMediaTypeException(
        `${normalisedContentType} is not supported. Allowed types: ${allowedContentTypes.join(', ')}`,
      );
    }

    await this.assertFolderIsUsable({ userId, folderId });

    // Generated up front so the storage key can embed it, keeping the key
    // deterministic and owner-scoped.
    const fileId = randomUUID();
    const storageKey = buildStorageKey({ ownerId: userId, fileId, filename });

    const file = await this.prisma.file.create({
      data: {
        id: fileId,
        name: sanitiseFilename(filename),
        sizeBytes,
        contentType: normalisedContentType,
        storageKey,
        ownerId: userId,
        folderId: folderId ?? null,
        status: 'PENDING',
      },
    });

    const uploadUrl = await this.storage.createUploadUrl({
      key: storageKey,
      contentType: normalisedContentType,
    });

    return {
      uploadId: file.id,
      uploadUrl,
      requiredHeaders: { 'Content-Type': normalisedContentType },
      expiresInSeconds: this.configService.getOrThrow<number>(
        'storage.uploadUrlTtlSeconds',
      ),
    };
  }

  /**
   * Step 2. Confirms the bytes really arrived before the file becomes
   * visible.
   *
   * Idempotent: calling it twice on a READY file returns the same result
   * rather than erroring, because a client that retries after a dropped
   * response should not be punished for it.
   */
  async completeUpload({
    userId,
    uploadId,
  }: {
    userId: string;
    uploadId: string;
  }): Promise<FileResponseDto> {
    // Scoped by ownerId, so one user completing another's upload is a 404,
    // not a leak.
    const file = await this.prisma.file.findFirst({
      where: { id: uploadId, ownerId: userId, deletedAt: null },
    });

    if (!file) {
      throw new NotFoundException('Upload not found');
    }

    if (file.status === 'READY') {
      return toFileResponse(file);
    }

    const stored = await this.storage.statObject(file.storageKey);

    if (!stored) {
      // The row stays PENDING so the client can retry the PUT and call
      // complete again.
      throw new BadRequestException(
        'File was not found in storage. Upload the file before completing.',
      );
    }

    // The declared size at init was a claim; this is the measurement. A
    // client could otherwise declare 1KB and push far more through the
    // presigned URL.
    const maxBytes = this.configService.getOrThrow<number>('uploads.maxBytes');
    if (stored.sizeBytes > maxBytes) {
      this.logger.warn(
        `Upload ${file.id} exceeded the size limit on inspection (${stored.sizeBytes} bytes)`,
      );
      throw new PayloadTooLargeException(
        `Uploaded file exceeds the ${Math.floor(maxBytes / 1024 / 1024)}MB limit`,
      );
    }

    const updated = await this.prisma.file.update({
      where: { id: file.id },
      data: {
        status: 'READY',
        // Trust the measured size over the declared one.
        sizeBytes: stored.sizeBytes,
      },
    });

    return toFileResponse(updated);
  }

  /**
   * A folder must exist, belong to this user, and not be deleted before we
   * accept an upload into it. Without the ownership half, a client could
   * drop files into someone else's folder by guessing an id.
   */
  private async assertFolderIsUsable({
    userId,
    folderId,
  }: {
    userId: string;
    folderId?: string | null;
  }): Promise<void> {
    if (!folderId) {
      return;
    }

    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, ownerId: userId, deletedAt: null },
      select: { id: true },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
  }
}
