import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type {
  ShareLinkResponseDto,
  SharedFileResponseDto,
} from './dto/share-response.dto';

/** 32 bytes = 256 bits of entropy. Guessing a valid token is infeasible,
 *  which is what lets the endpoint be public with no other credential. */
const TOKEN_BYTES = 32;

@Injectable()
export class SharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Mints a share link for a file the caller owns.
   *
   * The raw token is returned to the caller exactly once and never stored -
   * only its SHA-256 hash goes to the database, so a database leak yields
   * no usable share URLs. SHA-256 rather than bcrypt because the lookup
   * must be an indexed equality match, and the token is 256 bits of CSPRNG
   * output rather than a low-entropy human password, so the slow-hash
   * property bcrypt provides buys nothing here.
   */
  async createShareLink({
    userId,
    fileId,
  }: {
    userId: string;
    fileId: string;
  }): Promise<ShareLinkResponseDto> {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, ownerId: userId, deletedAt: null, status: 'READY' },
      select: { id: true },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const ttlSeconds = this.configService.getOrThrow<number>(
      'sharing.tokenTtlSeconds',
    );
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    // Any previously active link for this file is revoked, so "share" is
    // idempotent from the user's point of view: one file, one live URL, and
    // re-sharing invalidates a link that may have been pasted somewhere the
    // owner regrets.
    await this.prisma.shareLink.updateMany({
      where: { fileId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.prisma.shareLink.create({
      data: { tokenHash: hashToken(token), fileId, expiresAt },
    });

    return {
      token,
      url: `${this.configService.getOrThrow<string>('app.publicUrl')}/share/${token}`,
      expiresAt,
    };
  }

  async revokeShareLinks({
    userId,
    fileId,
  }: {
    userId: string;
    fileId: string;
  }): Promise<void> {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, ownerId: userId, deletedAt: null },
      select: { id: true },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    await this.prisma.shareLink.updateMany({
      where: { fileId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Public resolution of a share token. No authentication - the token is
   * the credential - which is why it must work in a private window with no
   * session.
   *
   * Every condition that makes a link usable is in the WHERE clause rather
   * than checked in application code afterwards: expiry, revocation, and
   * the file still being present and READY. A row that fails any of them is
   * never returned, so there is no path where a forgotten `if` serves an
   * expired link.
   */
  async resolveShareToken(token: string): Promise<SharedFileResponseDto> {
    const link = await this.prisma.shareLink.findFirst({
      where: {
        tokenHash: hashToken(token),
        revokedAt: null,
        expiresAt: { gt: new Date() },
        // Soft-deleting a file therefore kills its share links implicitly.
        file: { deletedAt: null, status: 'READY' },
      },
      include: { file: true },
    });

    if (!link) {
      // One response for invalid, expired, revoked and deleted alike, so
      // the endpoint cannot be used to probe which tokens once existed.
      throw new NotFoundException('This link is invalid or has expired');
    }

    const url = await this.storage.createDownloadUrl({
      key: link.file.storageKey,
      downloadName: link.file.name,
    });

    return {
      name: link.file.name,
      sizeBytes: link.file.sizeBytes,
      contentType: link.file.contentType,
      downloadUrl: url,
      expiresAt: link.expiresAt,
    };
  }
}

/** Deterministic so the hash can be an indexed equality lookup. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
