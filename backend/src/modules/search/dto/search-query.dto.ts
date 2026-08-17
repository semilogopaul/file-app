import { IsString, MaxLength } from 'class-validator';

export class SearchQueryDto {
  @IsString({ message: 'A search term (q) is required' })
  // Bounded so an enormous term cannot be used to make Postgres do
  // pathological work on every keystroke.
  @MaxLength(255, { message: 'Search term must be at most 255 characters' })
  readonly q!: string;
}
