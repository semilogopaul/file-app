import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { ACCESS_TOKEN_COOKIE } from '../auth-cookie';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '../interfaces/jwt-payload.interface';

/**
 * Reads the token from the httpOnly session cookie, if present.
 *
 * Express types `request.cookies` as `any` (cookie-parser augments it at
 * runtime), so the value is narrowed explicitly rather than trusted - a
 * malformed cookie jar must not smuggle a non-string into the verifier.
 */
function fromSessionCookie(request: Request): string | null {
  const { cookies } = request as Request & { cookies?: unknown };

  if (typeof cookies !== 'object' || cookies === null) {
    return null;
  }

  const token = (cookies as Record<string, unknown>)[ACCESS_TOKEN_COOKIE];

  return typeof token === 'string' ? token : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      // Cookie first, then bearer. The browser uses the httpOnly cookie and
      // never handles the token itself; the Authorization header stays
      // supported so non-browser clients (curl, a mobile app, tests) are
      // not forced into cookie handling.
      jwtFromRequest: ExtractJwt.fromExtractors([
        fromSessionCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  /**
   * Runs only after the signature and expiry have already been verified.
   *
   * The database lookup is deliberate: a token stays cryptographically
   * valid until it expires, so without this a deleted user would keep full
   * access for the remainder of the token's lifetime. It also guarantees
   * downstream ownership checks compare against a user that still exists.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('Token no longer valid');
    }

    return user;
  }
}
