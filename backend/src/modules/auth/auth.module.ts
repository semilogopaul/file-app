import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        signOptions: {
          // jsonwebtoken types this as the template-literal union
          // `StringValue` ("7d", "30m", ...), which a plain string cannot
          // satisfy. The Joi schema already enforces exactly that shape at
          // boot, so the assertion cannot be violated at runtime.
          expiresIn: configService.getOrThrow<string>(
            'jwt.expiresIn',
          ) as `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, JwtStrategy],
})
export class AuthModule {}
