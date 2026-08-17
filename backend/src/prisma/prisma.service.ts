import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    // Prisma 7 requires a driver adapter - the old `datasourceUrl` /
    // `datasources` constructor options were removed. PrismaPg wraps the
    // `pg` connection pool directly.
    super({
      adapter: new PrismaPg({
        connectionString: configService.getOrThrow<string>('database.url'),
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    // Connect eagerly so a bad DATABASE_URL fails at boot rather than on
    // the first request that happens to touch the database.
    await this.$connect();
    this.logger.log('Connected to the database');
  }
}
