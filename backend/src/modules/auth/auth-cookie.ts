import type { Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'istore_session';

/**
 * The access token is delivered as an httpOnly cookie rather than being
 * handed to JavaScript.
 *
 * nginx serves the app and the API from one origin, so the browser attaches
 * this to /api/* requests automatically - the frontend never reads, stores
 * or forwards the token, which means an XSS bug cannot exfiltrate it. The
 * token is still returned in the response body as well, so non-browser
 * clients can use the Authorization header instead.
 */
export function setAuthCookie(
  response: Response,
  token: string,
  { secure, maxAgeMs }: { secure: boolean; maxAgeMs: number },
): void {
  response.cookie(ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    // `lax` blocks the cross-site POST/PATCH/DELETE that CSRF relies on,
    // while still allowing a normal top-level link into the app to carry
    // the session (which `strict` would break).
    sameSite: 'lax',
    // Only over HTTPS in production; a `secure` cookie is silently dropped
    // over plain HTTP, which would break local development.
    secure,
    path: '/',
    maxAge: maxAgeMs,
  });
}

export function clearAuthCookie(
  response: Response,
  { secure }: { secure: boolean },
): void {
  // Options must match those used when setting it, or the browser keeps
  // the original cookie.
  response.clearCookie(ACCESS_TOKEN_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
  });
}
