import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update.dto';
import type {
  FolderContentsDto,
  FolderResponseDto,
} from './dto/folder-response.dto';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  /** Root-level folders and files for the authenticated user. */
  @Get()
  listRoot(@CurrentUser() user: AuthenticatedUser): Promise<FolderContentsDto> {
    return this.foldersService.listRoot({ userId: user.id });
  }

  @Get(':id')
  listFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FolderContentsDto> {
    return this.foldersService.listFolder({ userId: user.id, folderId: id });
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFolderDto,
  ): Promise<FolderResponseDto> {
    return this.foldersService.create({
      userId: user.id,
      name: dto.name,
      parentId: dto.parentId,
    });
  }

  /** Rename, move, or both. Moving into own subtree is rejected. */
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFolderDto,
  ): Promise<FolderResponseDto> {
    return this.foldersService.update({
      userId: user.id,
      folderId: id,
      name: dto.name,
      parentId: dto.parentId,
      isMove: 'parentId' in dto,
    });
  }

  /** Soft-deletes the folder and everything beneath it, recursively. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.foldersService.softDeleteRecursively({
      userId: user.id,
      folderId: id,
    });
  }
}
