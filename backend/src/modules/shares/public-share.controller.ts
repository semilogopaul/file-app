import { Controller, Get, Param, VERSION_NEUTRAL } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { SharesService } from './shares.service';
import type { SharedFileResponseDto } from './dto/share-response.dto';

/**
 * The one unauthenticated data endpoint in the API.
 *
 * VERSION_NEUTRAL and mounted at /share/:token so the URL people paste to
 * each other stays short and stable - burying a shared link behind /v1
 * would mean every link breaks the day the API is versioned up.
 */
@Public()
@Controller({ path: 'share', version: VERSION_NEUTRAL })
export class PublicShareController {
  constructor(private readonly sharesService: SharesService) {}

  @Get(':token')
  resolve(@Param('token') token: string): Promise<SharedFileResponseDto> {
    return this.sharesService.resolveShareToken(token);
  }
}
