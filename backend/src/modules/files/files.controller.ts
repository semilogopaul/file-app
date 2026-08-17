import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FilesService } from './files.service';
import type { FileResponseDto } from '../uploads/dto/upload-response.dto';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FileResponseDto> {
    return this.filesService.findOne({ userId: user.id, fileId: id });
  }

  /**
   * Returns a presigned URL rather than redirecting, so the frontend can
   * decide between previewing and downloading, and can surface an error
   * inline instead of navigating away from the app.
   */
  @Get(':id/download-url')
  createDownloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('inline') inline?: string,
  ): Promise<{ url: string; name: string; contentType: string }> {
    return this.filesService.createDownloadUrl({
      userId: user.id,
      fileId: id,
      inline: inline === 'true',
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.filesService.softDelete({ userId: user.id, fileId: id });
  }
}
