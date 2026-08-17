import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UploadsService } from './uploads.service';

const MAX_BYTES = 10 * 1024 * 1024;

const CONFIG: Record<string, unknown> = {
  'uploads.maxBytes': MAX_BYTES,
  'uploads.allowedContentTypes': ['image/png', 'application/pdf'],
  'storage.uploadUrlTtlSeconds': 900,
};

describe('UploadsService', () => {
  let service: UploadsService;
  let fileCreate: jest.Mock;
  let fileFindFirst: jest.Mock;
  let fileUpdate: jest.Mock;
  let folderFindFirst: jest.Mock;
  let createUploadUrl: jest.Mock;
  let statObject: jest.Mock;

  const USER_ID = '11111111-1111-4111-8111-111111111111';
  const VALID = {
    userId: USER_ID,
    filename: 'photo.png',
    sizeBytes: 1024,
    contentType: 'image/png',
  };

  /** Captured in the mock implementations so they stay typed, rather than
   *  reaching into `mock.calls`, which is `any`. */
  let createdFileData:
    { ownerId: string; status: string; storageKey: string } | undefined;
  let signedUrlArgs: { key: string; contentType: string } | undefined;

  beforeEach(async () => {
    createdFileData = undefined;
    signedUrlArgs = undefined;

    fileCreate = jest.fn(
      (args: {
        data: { ownerId: string; status: string; storageKey: string };
      }) => {
        createdFileData = args.data;
        return Promise.resolve({ ...args.data, status: 'PENDING' });
      },
    );
    fileFindFirst = jest.fn();
    fileUpdate = jest.fn();
    folderFindFirst = jest.fn();
    createUploadUrl = jest.fn((args: { key: string; contentType: string }) => {
      signedUrlArgs = args;
      return Promise.resolve('https://storage/presigned');
    });
    statObject = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        {
          provide: PrismaService,
          useValue: {
            file: {
              create: fileCreate,
              findFirst: fileFindFirst,
              update: fileUpdate,
            },
            folder: { findFirst: folderFindFirst },
          },
        },
        { provide: StorageService, useValue: { createUploadUrl, statObject } },
        {
          provide: ConfigService,
          useValue: { getOrThrow: (key: string) => CONFIG[key] },
        },
      ],
    }).compile();

    service = module.get(UploadsService);
  });

  describe('initUpload', () => {
    it('rejects a file over the size limit before issuing any URL', async () => {
      await expect(
        service.initUpload({ ...VALID, sizeBytes: MAX_BYTES + 1 }),
      ).rejects.toBeInstanceOf(PayloadTooLargeException);

      // Nothing should be persisted or signed for a rejected upload.
      expect(fileCreate).not.toHaveBeenCalled();
      expect(createUploadUrl).not.toHaveBeenCalled();
    });

    it('rejects a content type outside the allow-list', async () => {
      await expect(
        service.initUpload({
          ...VALID,
          contentType: 'application/x-msdownload',
        }),
      ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
      expect(createUploadUrl).not.toHaveBeenCalled();
    });

    it('normalises a content type carrying parameters', async () => {
      await service.initUpload({
        ...VALID,
        contentType: 'image/PNG; charset=binary',
      });

      expect(createUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: 'image/png' }),
      );
    });

    it('signs the URL with a server-generated, owner-scoped key', async () => {
      await service.initUpload(VALID);

      expect(signedUrlArgs?.key).toMatch(
        new RegExp(`^users/${USER_ID}/[0-9a-f-]{36}/photo\\.png$`),
      );
    });

    it('creates the row PENDING with the owner already attached', async () => {
      await service.initUpload(VALID);

      // Committing ownership at init is what removes the init/complete
      // race: /complete never has to trust client-supplied ownership.
      expect(createdFileData?.ownerId).toBe(USER_ID);
      expect(createdFileData?.status).toBe('PENDING');
    });

    it('signs the same key it persisted, so complete can find the object', async () => {
      await service.initUpload(VALID);

      expect(signedUrlArgs?.key).toBe(createdFileData?.storageKey);
    });

    it('refuses a folder belonging to another user', async () => {
      folderFindFirst.mockResolvedValue(null);

      await expect(
        service.initUpload({
          ...VALID,
          folderId: '22222222-2222-4222-8222-222222222222',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(fileCreate).not.toHaveBeenCalled();
    });
  });

  describe('completeUpload', () => {
    const pendingFile = {
      id: 'file-1',
      ownerId: USER_ID,
      storageKey: 'users/x/file-1/photo.png',
      status: 'PENDING',
      sizeBytes: 1024,
      name: 'photo.png',
      contentType: 'image/png',
      folderId: null,
      thumbnailKey: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('rejects completing an upload that is not in storage', async () => {
      fileFindFirst.mockResolvedValue(pendingFile);
      statObject.mockResolvedValue(null);

      await expect(
        service.completeUpload({ userId: USER_ID, uploadId: 'file-1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      // Must stay PENDING so the client can retry the PUT.
      expect(fileUpdate).not.toHaveBeenCalled();
    });

    // The client's declared size is a claim; this is the measurement.
    it('rejects when the stored object exceeds the limit despite a small declared size', async () => {
      fileFindFirst.mockResolvedValue(pendingFile);
      statObject.mockResolvedValue({
        key: pendingFile.storageKey,
        sizeBytes: MAX_BYTES + 1,
        contentType: 'image/png',
      });

      await expect(
        service.completeUpload({ userId: USER_ID, uploadId: 'file-1' }),
      ).rejects.toBeInstanceOf(PayloadTooLargeException);
      expect(fileUpdate).not.toHaveBeenCalled();
    });

    it('marks the file READY using the measured size, not the declared one', async () => {
      fileFindFirst.mockResolvedValue(pendingFile);
      statObject.mockResolvedValue({
        key: pendingFile.storageKey,
        sizeBytes: 2048,
        contentType: 'image/png',
      });
      fileUpdate.mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...pendingFile, ...args.data }),
      );

      const result = await service.completeUpload({
        userId: USER_ID,
        uploadId: 'file-1',
      });

      expect(result.status).toBe('READY');
      expect(result.sizeBytes).toBe(2048);
    });

    it('is idempotent for an already-completed upload', async () => {
      fileFindFirst.mockResolvedValue({ ...pendingFile, status: 'READY' });

      const result = await service.completeUpload({
        userId: USER_ID,
        uploadId: 'file-1',
      });

      expect(result.status).toBe('READY');
      // No second storage round-trip, no redundant write.
      expect(statObject).not.toHaveBeenCalled();
      expect(fileUpdate).not.toHaveBeenCalled();
    });

    it('does not expose the storage key in the response', async () => {
      fileFindFirst.mockResolvedValue({ ...pendingFile, status: 'READY' });

      const result = await service.completeUpload({
        userId: USER_ID,
        uploadId: 'file-1',
      });

      expect(JSON.stringify(result)).not.toContain('storageKey');
      expect(JSON.stringify(result)).not.toContain(pendingFile.storageKey);
    });

    it('treats another user’s upload as not found', async () => {
      // The ownerId is part of the WHERE clause, so the row simply is not
      // returned for a different user.
      fileFindFirst.mockResolvedValue(null);

      await expect(
        service.completeUpload({ userId: 'someone-else', uploadId: 'file-1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
