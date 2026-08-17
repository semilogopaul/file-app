import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * Exported so uploads/files/sharing can sign URLs. Cross-module access goes
 * through this provider rather than any module reaching for the S3 client
 * directly.
 */
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
