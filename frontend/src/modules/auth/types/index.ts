export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
}

export interface AuthResponse {
  readonly accessToken: string;
  readonly expiresIn: string;
  readonly user: AuthenticatedUser;
}

export interface Credentials {
  readonly email: string;
  readonly password: string;
}
