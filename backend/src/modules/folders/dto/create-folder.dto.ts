import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Trims and collapses whitespace; strips characters that would make a
 *  folder name ambiguous in a path-like UI. */
const normaliseName = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string'
    ? value.replace(/[\\/]/g, '').replace(/\s+/g, ' ').trim()
    : value;

export class CreateFolderDto {
  @IsString()
  @Transform(normaliseName)
  @MinLength(1, { message: 'Folder name is required' })
  @MaxLength(255, { message: 'Folder name must be at most 255 characters' })
  readonly name!: string;

  /** Omitted or null creates the folder at the owner's root. */
  @IsOptional()
  @IsUUID('4', { message: 'parentId must be a valid id' })
  readonly parentId?: string | null;
}

export class RenameDto {
  @IsString()
  @Transform(normaliseName)
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255, { message: 'Name must be at most 255 characters' })
  readonly name!: string;
}
