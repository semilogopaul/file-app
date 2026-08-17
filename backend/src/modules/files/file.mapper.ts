import type { File } from '../../generated/prisma/client';
import type { FileResponseDto } from '../uploads/dto/upload-response.dto';

/**
 * A File row with its *currently active* share links loaded.
 *
 * The relation is required rather than optional on purpose: if it were
 * optional, a query that forgot to include it would silently report
 * `hasActiveShare: false` for a file that is in fact shared - a wrong
 * answer with no error. Requiring it makes the compiler point at every call
 * site instead.
 */
export interface FileWithActiveShares extends File {
  shareLinks: { id: string }[];
}

/**
 * Prisma filter selecting only share links that are still usable. Shared by
 * every query that needs the flag, so the definition of "active" cannot
 * drift between call sites.
 */
export const activeShareLinksInclude = () => ({
  shareLinks: {
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true },
    take: 1,
  },
});

/**
 * Single conversion point from a File row to its public shape.
 *
 * Everything that returns a file goes through here so `storageKey` and
 * `thumbnailKey` cannot leak by accident - exposing them would hand clients
 * the internal object layout, and the owner id embedded in it. The mapper
 * lists fields explicitly rather than spreading and deleting, so a column
 * added later is hidden by default instead of exposed by default.
 */
export function toFileResponse(file: FileWithActiveShares): FileResponseDto {
  return {
    id: file.id,
    name: file.name,
    sizeBytes: file.sizeBytes,
    contentType: file.contentType,
    status: file.status,
    folderId: file.folderId,
    hasThumbnail: file.thumbnailKey !== null,
    hasActiveShare: file.shareLinks.length > 0,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}
