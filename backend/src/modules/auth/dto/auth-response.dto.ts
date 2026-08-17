/**
 * Outbound shape for /auth/register and /auth/login. Declared explicitly so
 * a User row can never be spread into a response wholesale - passwordHash
 * must never leave the service layer.
 */
export class AuthResponseDto {
  readonly accessToken!: string;
  readonly expiresIn!: string;
  readonly user!: {
    readonly id: string;
    readonly email: string;
  };
}
