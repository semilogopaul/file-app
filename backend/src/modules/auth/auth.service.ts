import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';
import type { AuthResponseDto } from './dto/auth-response.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
  ) {}

  async register({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('An account with that email already exists');
    }

    const passwordHash = await this.passwordService.hash(password);

    const user = await this.prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true },
    });

    return this.buildAuthResponse(user);
  }

  async login({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });

    // Always run a comparison, even with no matching user, so both paths
    // cost one bcrypt verification.
    const passwordMatches =
      await this.passwordService.compareWithTimingEqualisation(
        password,
        user?.passwordHash,
      );

    // One message for both "no such account" and "wrong password" - telling
    // them apart would confirm which emails are registered.
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    return this.buildAuthResponse({ id: user.id, email: user.email });
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
  }): AuthResponseDto {
    // `sub` is the standard JWT claim for the subject. Nothing sensitive
    // goes in the payload - it is signed, not encrypted, so anyone holding
    // the token can read it.
    const payload: JwtPayload = { sub: user.id, email: user.email };

    return {
      accessToken: this.jwtService.sign(payload),
      expiresIn: this.configService.getOrThrow<string>('jwt.expiresIn'),
      user: { id: user.id, email: user.email },
    };
  }
}
