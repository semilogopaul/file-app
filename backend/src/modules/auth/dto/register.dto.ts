import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  // Normalised here so "Foo@Example.com" and "foo@example.com" cannot
  // become two accounts. The DB unique index then genuinely means one
  // account per address.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  readonly email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  // bcrypt silently truncates input beyond 72 bytes, so reject longer
  // passwords outright rather than accepting one that is not fully checked.
  @MaxLength(72, { message: 'Password must be at most 72 characters' })
  readonly password!: string;
}
