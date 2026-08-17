import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SharesService } from './shares.service';

const CONFIG: Record<string, unknown> = {
  'sharing.tokenTtlSeconds': 86400,
  'app.publicUrl': 'https://files.example.com',
};

interface ShareWhere {
  tokenHash?: string;
  revokedAt?: null;
  expiresAt?: { gt: Date };
  file?: { deletedAt: null; status: string };
}

describe('SharesService', () => {
  let service: SharesService;
  let fileFindFirst: jest.Mock;
  let shareCreate: jest.Mock;
  let shareUpdateMany: jest.Mock;
  let shareFindFirst: jest.Mock;
  let createDownloadUrl: jest.Mock;

  let createdShare: { tokenHash: string; expiresAt: Date } | undefined;
  let lookupWhere: ShareWhere | undefined;

  const USER_ID = 'user-1';
  const FILE_ID = 'file-1';

  beforeEach(async () => {
    createdShare = undefined;
    lookupWhere = undefined;

    fileFindFirst = jest.fn().mockResolvedValue({ id: FILE_ID });
    shareCreate = jest.fn(
      (args: { data: { tokenHash: string; expiresAt: Date } }) => {
        createdShare = args.data;
        return Promise.resolve({ id: 'share-1', ...args.data });
      },
    );
    shareUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    shareFindFirst = jest.fn((args: { where: ShareWhere }) => {
      lookupWhere = args.where;
      return Promise.resolve(null);
    });
    createDownloadUrl = jest.fn().mockResolvedValue('https://storage/signed');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharesService,
        {
          provide: PrismaService,
          useValue: {
            file: { findFirst: fileFindFirst },
            shareLink: {
              create: shareCreate,
              updateMany: shareUpdateMany,
              findFirst: shareFindFirst,
            },
          },
        },
        { provide: StorageService, useValue: { createDownloadUrl } },
        {
          provide: ConfigService,
          useValue: { getOrThrow: (key: string) => CONFIG[key] },
        },
      ],
    }).compile();

    service = module.get(SharesService);
  });

  describe('createShareLink', () => {
    // The whole point of hashing: a database dump must not yield working
    // share URLs.
    it('stores only a SHA-256 hash, never the token itself', async () => {
      const { token } = await service.createShareLink({
        userId: USER_ID,
        fileId: FILE_ID,
      });

      expect(createdShare?.tokenHash).not.toBe(token);
      expect(createdShare?.tokenHash).toBe(
        createHash('sha256').update(token).digest('hex'),
      );
    });

    it('issues a token with enough entropy to be unguessable', async () => {
      const { token } = await service.createShareLink({
        userId: USER_ID,
        fileId: FILE_ID,
      });

      // 32 random bytes in base64url.
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });

    it('produces a different token every time', async () => {
      const first = await service.createShareLink({
        userId: USER_ID,
        fileId: FILE_ID,
      });
      const second = await service.createShareLink({
        userId: USER_ID,
        fileId: FILE_ID,
      });

      expect(first.token).not.toBe(second.token);
    });

    it('revokes any previously active link for the same file', async () => {
      await service.createShareLink({ userId: USER_ID, fileId: FILE_ID });

      expect(shareUpdateMany).toHaveBeenCalledTimes(1);
    });

    it('builds the URL from the configured public origin', async () => {
      const { url, token } = await service.createShareLink({
        userId: USER_ID,
        fileId: FILE_ID,
      });

      expect(url).toBe(`https://files.example.com/share/${token}`);
    });

    it('refuses a file the caller does not own', async () => {
      fileFindFirst.mockResolvedValue(null);

      await expect(
        service.createShareLink({ userId: USER_ID, fileId: FILE_ID }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(shareCreate).not.toHaveBeenCalled();
    });
  });

  describe('resolveShareToken', () => {
    /**
     * The brief asks for expiry to be enforced "at the query level, not in
     * application code". This asserts that: every condition that makes a
     * link usable is in the WHERE clause, so there is no code path where a
     * forgotten `if` could serve an expired or revoked link.
     */
    it('puts expiry, revocation and file state in the WHERE clause', async () => {
      await service.resolveShareToken('some-token').catch(() => undefined);

      expect(lookupWhere?.revokedAt).toBeNull();
      expect(lookupWhere?.expiresAt?.gt).toBeInstanceOf(Date);
      expect(lookupWhere?.file).toEqual({ deletedAt: null, status: 'READY' });
    });

    it('looks the token up by its hash, not its raw value', async () => {
      await service.resolveShareToken('some-token').catch(() => undefined);

      expect(lookupWhere?.tokenHash).toBe(
        createHash('sha256').update('some-token').digest('hex'),
      );
    });

    it('gives one indistinguishable error when no usable link matches', async () => {
      await expect(service.resolveShareToken('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns file metadata and a download URL, but no identifiers', async () => {
      shareFindFirst.mockResolvedValue({
        id: 'share-1',
        expiresAt: new Date('2030-01-01'),
        file: {
          id: FILE_ID,
          ownerId: USER_ID,
          name: 'photo.png',
          sizeBytes: 1024,
          contentType: 'image/png',
          storageKey: 'users/user-1/file-1/photo.png',
        },
      });

      const result = await service.resolveShareToken('valid');
      const serialised = JSON.stringify(result);

      expect(result.name).toBe('photo.png');
      expect(result.downloadUrl).toBe('https://storage/signed');
      // Someone holding a share link learns about that one file, and
      // nothing about the account behind it.
      expect(serialised).not.toContain(USER_ID);
      expect(serialised).not.toContain('storageKey');
      expect(serialised).not.toContain('users/user-1');
    });
  });
});
