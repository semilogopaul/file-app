import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import type { FileResponseDto } from '../uploads/dto/upload-response.dto';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: SearchQueryDto,
  ): Promise<FileResponseDto[]> {
    return this.searchService.searchFiles({ userId: user.id, query: dto.q });
  }
}
