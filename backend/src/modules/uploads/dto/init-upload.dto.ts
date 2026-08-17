import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class InitUploadDto {
  @IsString()
  @MinLength(1, { message: 'Filename is required' })
  @MaxLength(255, { message: 'Filename must be at most 255 characters' })
  readonly filename!: string;

  /**
   * Declared size. Checked against the configured limit here, then
   * re-checked against the object's real size at /complete - a client can
   * under-declare, so this alone is not trusted.
   */
  @IsInt({ message: 'File size must be a whole number of bytes' })
  @Min(1, { message: 'File is empty' })
  readonly sizeBytes!: number;

  /**
   * Validated against the allow-list and then baked into the presigned
   * URL's signature, so it cannot be swapped at upload time.
   */
  @IsString()
  @MaxLength(255)
  readonly contentType!: string;

  /** Omitted or null uploads to the owner's root. */
  @IsOptional()
  @IsUUID('4', { message: 'folderId must be a valid id' })
  readonly folderId?: string | null;
}
