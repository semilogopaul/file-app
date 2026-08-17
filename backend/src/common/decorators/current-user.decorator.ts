import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';

/**
 * Injects the authenticated user that JwtStrategy.validate() attached to
 * the request.
 *
 * Every data endpoint scopes its queries by this id rather than trusting an
 * owner id from the request body or query string - that is what stops one
 * user reading another's files.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    if (!request.user) {
      // Only reachable if this decorator is used on a @Public() route,
      // which is a programming error rather than a client error.
      throw new Error(
        'CurrentUser used on a route without authentication - remove @Public() or the decorator',
      );
    }

    return request.user;
  },
);
