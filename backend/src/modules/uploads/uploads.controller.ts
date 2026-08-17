import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadsService } from './uploads.service';
import { InitUploadDto } from './dto/init-upload.dto';
import type {
  FileResponseDto,
  InitUploadResponseDto,
} from './dto/upload-response.dto';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('init')
  init(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InitUploadDto,
  ): Promise<InitUploadResponseDto> {
    return this.uploadsService.initUpload({
      userId: user.id,
      filename: dto.filename,
      sizeBytes: dto.sizeBytes,
      contentType: dto.contentType,
      folderId: dto.folderId,
    });
  }

  @Post(':id/complete')
  // 200, not 201: this transitions an existing resource rather than
  // creating one - the row was created by /init.
  @HttpCode(HttpStatus.OK)
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FileResponseDto> {
    return this.uploadsService.completeUpload({
      userId: user.id,
      uploadId: id,
    });
  }
}
