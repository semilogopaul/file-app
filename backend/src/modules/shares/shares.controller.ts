import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SharesService } from './shares.service';
import type { ShareLinkResponseDto } from './dto/share-response.dto';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

/** Owner-facing share management. Authenticated like everything else. */
@Controller('files')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Post(':id/share')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ShareLinkResponseDto> {
    return this.sharesService.createShareLink({ userId: user.id, fileId: id });
  }

  /** Stops an existing link working, without deleting the file. */
  @Delete(':id/share')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.sharesService.revokeShareLinks({ userId: user.id, fileId: id });
  }
}
