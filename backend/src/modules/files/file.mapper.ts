import type { File } from '../../generated/prisma/client';
import type { FileResponseDto } from '../uploads/dto/upload-response.dto';

/**
 * Single conversion point from a File row to its public shape.
 *
 * Everything that returns a file goes through here so `storageKey` and
 * `thumbnailKey` cannot leak by accident - exposing them would hand clients
 * the internal object layout, and the owner id embedded in it. The mapper
 * lists fields explicitly rather than spreading and deleting, so a column
 * added later is hidden by default instead of exposed by default.
 */
export function toFileResponse(file: File): FileResponseDto {
  return {
    id: file.id,
    name: file.name,
    sizeBytes: file.sizeBytes,
    contentType: file.contentType,
    status: file.status,
    folderId: file.folderId,
    hasThumbnail: file.thumbnailKey !== null,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}
