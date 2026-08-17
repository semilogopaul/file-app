import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger as PinoLogger } from 'nestjs-pino';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import type { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(PinoLogger));

  app.use(helmet());

  const configService = app.get(ConfigService<AppConfig, true>);
  const corsOrigins = configService.get('cors.origins', { infer: true });

  app.enableCors({
    origin: corsOrigins.length > 0 ? [...corsOrigins] : false,
    credentials: true,
  });

  // Product API surface is versioned (/v1/...); the health module opts out
  // via VERSION_NEUTRAL since it isn't a product endpoint.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Let in-flight requests finish and Nest's lifecycle hooks run before the
  // process exits, instead of dropping connections on SIGTERM.
  app.enableShutdownHooks();

  const port = configService.get('port', { infer: true });
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
