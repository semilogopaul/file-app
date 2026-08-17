import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { SharesController } from './shares.controller';
import { PublicShareController } from './public-share.controller';
import { SharesService } from './shares.service';

@Module({
  imports: [StorageModule],
  controllers: [SharesController, PublicShareController],
  providers: [SharesService],
})
export class SharesModule {}
