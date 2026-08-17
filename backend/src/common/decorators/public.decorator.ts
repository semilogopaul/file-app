import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route out of the global JwtAuthGuard. Use sparingly - currently
 * only /auth/register, /auth/login, /share/:token and /health.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
