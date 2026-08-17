import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global so feature modules can inject PrismaService without each importing
 * PrismaModule. This is the one place a @Global module is justified: a
 * single shared connection pool that every module needs, with no risk of a
 * circular dependency.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
