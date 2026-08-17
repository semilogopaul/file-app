import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { clearAuthCookie, setAuthCookie } from './auth-cookie';
import type { AuthResponseDto } from './dto/auth-response.dto';
import type { AuthenticatedUser } from './interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    // passthrough so Nest still serialises the returned object; without it
    // injecting @Res() would make us responsible for sending the response.
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register({
      email: dto.email,
      password: dto.password,
    });

    this.issueCookie(response, result.accessToken);
    return result;
  }

  @Public()
  @Post('login')
  // 200 rather than the default 201: logging in does not create a resource.
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login({
      email: dto.email,
      password: dto.password,
    });

    this.issueCookie(response, result.accessToken);
    return result;
  }

  /**
   * Clears the session cookie. Public because an expired or already-invalid
   * token should still be able to log out cleanly rather than returning 401
   * and stranding the user in a signed-in-looking UI.
   */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) response: Response): void {
    clearAuthCookie(response, { secure: this.isProduction() });
  }

  /**
   * Lets the frontend confirm the session is still valid on boot. With an
   * httpOnly cookie the client cannot inspect the token itself, so this is
   * the only way for it to know whether it is signed in.
   */
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  private issueCookie(response: Response, token: string): void {
    setAuthCookie(response, token, {
      secure: this.isProduction(),
      maxAgeMs: parseExpiryToMs(
        this.configService.getOrThrow<string>('jwt.expiresIn'),
      ),
    });
  }

  private isProduction(): boolean {
    return this.configService.getOrThrow<string>('env') === 'production';
  }
}

const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  y: 31_536_000_000,
};

/**
 * Converts the configured JWT lifetime ("7d") into milliseconds so the
 * cookie expires alongside the token it carries. The Joi schema guarantees
 * this shape at boot, so the fallback is unreachable in practice.
 */
function parseExpiryToMs(expiresIn: string): number {
  const match = /^(\d+)([smhdwy])$/.exec(expiresIn);

  if (!match) {
    return UNIT_MS.d * 7;
  }

  return parseInt(match[1], 10) * UNIT_MS[match[2]];
}
