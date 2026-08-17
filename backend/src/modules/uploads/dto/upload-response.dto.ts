import type { FileStatus } from '../../../generated/prisma/enums';

/** Returned by /uploads/init. */
export class InitUploadResponseDto {
  /** Also the file id - /uploads/:id/complete takes this value. */
  readonly uploadId!: string;
  /** Presigned PUT the browser uploads to directly. */
  readonly uploadUrl!: string;
  /**
   * Headers the client MUST send on that PUT. Content-Type is part of the
   * signature, so omitting or changing it fails with a 403 from storage.
   */
  readonly requiredHeaders!: Record<string, string>;
  readonly expiresInSeconds!: number;
}

/** Public representation of a file. Never exposes the storage key. */
export class FileResponseDto {
  readonly id!: string;
  readonly name!: string;
  readonly sizeBytes!: number;
  readonly contentType!: string;
  readonly status!: FileStatus;
  readonly folderId!: string | null;
  readonly hasThumbnail!: boolean;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
}
