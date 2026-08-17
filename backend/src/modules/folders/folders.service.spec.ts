import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { FoldersService } from './folders.service';

/**
 * The recursive-CTE behaviour (cascade delete, size rollup, breadcrumbs)
 * cannot be meaningfully asserted against a mock - a mock would only prove
 * `$queryRaw` was called, not that the SQL is correct. Those paths are
 * covered against a real Postgres instead. What is unit-tested here is the
 * ownership and control flow around them, which is where a regression would
 * silently expose another user's data.
 */
describe('FoldersService', () => {
  let service: FoldersService;
  let folderFindFirst: jest.Mock;
  let folderCreate: jest.Mock;
  let folderUpdateMany: jest.Mock;
  let folderFindMany: jest.Mock;
  let fileFindMany: jest.Mock;
  let queryRaw: jest.Mock;

  const USER_ID = 'user-1';
  const FOLDER = {
    id: 'folder-1',
    name: 'Documents',
    parentId: null,
    ownerId: USER_ID,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  /** WHERE clauses captured from the mocks, typed so assertions do not
   *  have to reach into `mock.calls`, which is `any`. */
  interface WhereClause {
    id?: string;
    ownerId?: string;
    deletedAt?: null;
    status?: string;
    folderId?: string | null;
  }
  let renameWhere: WhereClause | undefined;
  let fileListWhere: WhereClause | undefined;

  beforeEach(async () => {
    renameWhere = undefined;
    fileListWhere = undefined;

    folderFindFirst = jest.fn().mockResolvedValue(FOLDER);
    folderCreate = jest.fn().mockResolvedValue(FOLDER);
    folderUpdateMany = jest.fn((args: { where: WhereClause }) => {
      renameWhere = args.where;
      return Promise.resolve({ count: 1 });
    });
    folderFindMany = jest.fn().mockResolvedValue([]);
    fileFindMany = jest.fn((args: { where: WhereClause }) => {
      fileListWhere = args.where;
      return Promise.resolve([]);
    });
    queryRaw = jest.fn().mockResolvedValue([{ total_size: 0n, file_count: 0 }]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoldersService,
        {
          provide: PrismaService,
          useValue: {
            folder: {
              findFirst: folderFindFirst,
              create: folderCreate,
              updateMany: folderUpdateMany,
              findMany: folderFindMany,
            },
            file: { findMany: fileFindMany },
            $queryRaw: queryRaw,
          },
        },
      ],
    }).compile();

    service = module.get(FoldersService);
  });

  describe('create', () => {
    it('rejects a parent the user does not own', async () => {
      folderFindFirst.mockResolvedValue(null);

      await expect(
        service.create({
          userId: USER_ID,
          name: 'Sub',
          parentId: 'someone-elses',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(folderCreate).not.toHaveBeenCalled();
    });

    it('does not query for a parent when creating at the root', async () => {
      await service.create({ userId: USER_ID, name: 'Top' });

      expect(folderFindFirst).not.toHaveBeenCalled();
      expect(folderCreate).toHaveBeenCalled();
    });
  });

  describe('rename', () => {
    it('scopes the update by owner so another user cannot rename it', async () => {
      await service.rename({
        userId: USER_ID,
        folderId: 'folder-1',
        name: 'New name',
      });

      expect(renameWhere).toMatchObject({
        id: 'folder-1',
        ownerId: USER_ID,
        deletedAt: null,
      });
    });

    it('404s when nothing matched', async () => {
      folderUpdateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.rename({ userId: USER_ID, folderId: 'x', name: 'n' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('softDeleteRecursively', () => {
    it('reports how much the cascade removed', async () => {
      queryRaw.mockResolvedValue([{ folders_deleted: 4, files_deleted: 3 }]);

      await expect(
        service.softDeleteRecursively({
          userId: USER_ID,
          folderId: 'folder-1',
        }),
      ).resolves.toEqual({ foldersDeleted: 4, filesDeleted: 3 });
    });

    // The CTE anchor carries owner_id, so a folder owned by someone else
    // matches nothing and the cascade updates zero rows.
    it('404s when the cascade touched no folders', async () => {
      queryRaw.mockResolvedValue([{ folders_deleted: 0, files_deleted: 0 }]);

      await expect(
        service.softDeleteRecursively({
          userId: USER_ID,
          folderId: 'folder-1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listFolder', () => {
    it('excludes deleted and not-yet-uploaded files from the listing', async () => {
      await service.listFolder({ userId: USER_ID, folderId: 'folder-1' });

      expect(fileListWhere).toMatchObject({
        ownerId: USER_ID,
        deletedAt: null,
        // PENDING rows exist before their bytes do; showing them would
        // mean listing files that cannot be opened.
        status: 'READY',
      });
    });

    it('404s for a folder the user does not own', async () => {
      folderFindFirst.mockResolvedValue(null);

      await expect(
        service.listFolder({ userId: USER_ID, folderId: 'someone-elses' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
