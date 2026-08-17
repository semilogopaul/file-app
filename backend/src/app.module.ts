import { randomUUID } from 'crypto';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage } from 'http';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: { abortEarly: false },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        // Correlates every log line for a request; reused as the error
        // envelope's traceId in AllExceptionsFilter.
        genReqId: (req: IncomingMessage) =>
          req.headers['x-request-id'] ?? randomUUID(),
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
      },
    }),
    // Feature modules register here, e.g. HealthModule, UsersModule, ...
    HealthModule,
  ],
})
export class AppModule {}
