import { IsEmail, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  readonly email!: string;

  // Deliberately no MinLength here: login must not reveal the password
  // policy, and a short value simply fails to match.
  @IsString()
  @MaxLength(72)
  readonly password!: string;
}
