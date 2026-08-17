import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';

describe('AuthService', () => {
  let service: AuthService;
  let findUnique: jest.Mock;
  let create: jest.Mock;
  let sign: jest.Mock;
  let passwordService: PasswordService;

  const CREDENTIALS = {
    email: 'alice@example.com',
    password: 'a-good-password',
  };

  /** Captured in the mock implementation so it stays typed, rather than
   *  digging an `any` out of create.mock.calls. */
  let createdUserData: { email: string; passwordHash: string } | undefined;

  /** Runs a login expected to fail and returns the rejection, narrowed to
   *  Error so assertions do not have to handle the success union member. */
  const captureLoginError = async (): Promise<Error> => {
    let caught: unknown;
    try {
      await service.login(CREDENTIALS);
    } catch (error) {
      caught = error;
    }
    if (!(caught instanceof Error)) {
      throw new Error('expected login to reject, but it resolved');
    }
    return caught;
  };

  beforeEach(async () => {
    findUnique = jest.fn();
    createdUserData = undefined;
    create = jest.fn(
      (args: { data: { email: string; passwordHash: string } }) => {
        createdUserData = args.data;
        return Promise.resolve({ id: 'user-1', email: args.data.email });
      },
    );
    sign = jest.fn().mockReturnValue('signed.jwt.token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        // The real PasswordService, so hashing behaviour is genuinely
        // exercised rather than stubbed away.
        PasswordService,
        {
          provide: PrismaService,
          useValue: { user: { findUnique, create } },
        },
        { provide: JwtService, useValue: { sign } },
        { provide: ConfigService, useValue: { getOrThrow: () => '7d' } },
      ],
    }).compile();

    service = module.get(AuthService);
    passwordService = module.get(PasswordService);
  });

  describe('register', () => {
    it('stores a bcrypt hash rather than the raw password', async () => {
      findUnique.mockResolvedValue(null);

      await service.register(CREDENTIALS);

      expect(createdUserData?.passwordHash).not.toBe(CREDENTIALS.password);
      // Verifies it is a real bcrypt hash of the password, not just munged.
      await expect(
        bcrypt.compare(
          CREDENTIALS.password,
          createdUserData?.passwordHash ?? '',
        ),
      ).resolves.toBe(true);
    });

    it('never returns the password hash to the caller', async () => {
      findUnique.mockResolvedValue(null);

      const result = await service.register(CREDENTIALS);

      expect(JSON.stringify(result)).not.toContain('passwordHash');
      expect(result.user).toEqual({ id: 'user-1', email: CREDENTIALS.email });
    });

    it('rejects an email that is already registered', async () => {
      findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(CREDENTIALS)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const withStoredPassword = async (password: string) => ({
      id: 'user-1',
      email: CREDENTIALS.email,
      passwordHash: await bcrypt.hash(password, 4),
    });

    it('issues a token when the password matches', async () => {
      findUnique.mockResolvedValue(
        await withStoredPassword(CREDENTIALS.password),
      );

      const result = await service.login(CREDENTIALS);

      expect(result.accessToken).toBe('signed.jwt.token');
      // Only non-sensitive claims belong in a signed (not encrypted) token.
      expect(sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: CREDENTIALS.email,
      });
    });

    it('rejects a wrong password', async () => {
      findUnique.mockResolvedValue(
        await withStoredPassword('a-different-password'),
      );

      await expect(service.login(CREDENTIALS)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    // The two failure modes must be indistinguishable, otherwise the
    // endpoint tells an attacker which emails have accounts.
    it('gives an identical error for an unknown account and a wrong password', async () => {
      findUnique.mockResolvedValue(
        await withStoredPassword('a-different-password'),
      );
      const wrongPassword = await captureLoginError();

      findUnique.mockResolvedValue(null);
      const unknownAccount = await captureLoginError();

      expect(unknownAccount).toBeInstanceOf(UnauthorizedException);
      expect(unknownAccount.message).toBe(wrongPassword.message);
    });

    it('still verifies a password when no user exists, to equalise timing', async () => {
      const compareSpy = jest.spyOn(passwordService, 'compare');
      findUnique.mockResolvedValue(null);

      await service.login(CREDENTIALS).catch(() => undefined);

      // Skipping the comparison would make "no such user" measurably
      // faster and leak account existence through response time.
      expect(compareSpy).toHaveBeenCalledTimes(1);
      // ...and it must run against a real hash, not an empty string.
      expect(compareSpy.mock.calls[0][1]).toMatch(/^\$2[aby]\$/);
    });
  });
});
