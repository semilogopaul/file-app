/** Claims this API signs into every access token. */
export interface JwtPayload {
  /** Standard JWT "subject" claim - the user id. */
  readonly sub: string;
  readonly email: string;
}

/**
 * What the JWT strategy attaches to `request.user` after a token is
 * verified. Deliberately distinct from JwtPayload: controllers should not
 * reason in terms of raw JWT claims.
 */
export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
}
