import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/** Trims and collapses whitespace; strips characters that would make a
 *  name ambiguous in a path-like UI. */
const normaliseName = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string'
    ? value.replace(/[\\/]/g, '').replace(/\s+/g, ' ').trim()
    : value;

/**
 * Partial update for a file: rename, move, or both.
 *
 * `folderId` distinguishes three cases deliberately:
 *   omitted → not a move, leave where it is
 *   null    → move to the owner's root
 *   uuid    → move into that folder
 *
 * `@ValidateIf` is what makes null legal while still rejecting a malformed
 * string - `@IsOptional()` alone would skip validation for null, but so
 * would it for any value, losing the uuid check.
 */
export class UpdateFileDto {
  @IsOptional()
  @IsString()
  @Transform(normaliseName)
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255, { message: 'Name must be at most 255 characters' })
  readonly name?: string;

  @IsOptional()
  @ValidateIf((object: UpdateFileDto) => object.folderId !== null)
  @IsUUID('4', { message: 'folderId must be a valid id' })
  readonly folderId?: string | null;
}

/** Same shape for folders, where the move target is the parent folder. */
export class UpdateFolderDto {
  @IsOptional()
  @IsString()
  @Transform(normaliseName)
  @MinLength(1, { message: 'Folder name is required' })
  @MaxLength(255, { message: 'Folder name must be at most 255 characters' })
  readonly name?: string;

  @IsOptional()
  @ValidateIf((object: UpdateFolderDto) => object.parentId !== null)
  @IsUUID('4', { message: 'parentId must be a valid id' })
  readonly parentId?: string | null;
}
