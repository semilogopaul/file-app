import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { AuthResponseDto } from './dto/auth-response.dto';
import type { AuthenticatedUser } from './interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register({
      email: dto.email,
      password: dto.password,
    });
  }

  @Public()
  @Post('login')
  // 200 rather than the default 201: logging in does not create a resource.
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login({
      email: dto.email,
      password: dto.password,
    });
  }

  /**
   * Lets the frontend confirm a stored token is still valid on boot without
   * having to decode it client-side.
   */
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
