import * as Joi from 'joi';

/**
 * Validated at bootstrap by ConfigModule (see app.module.ts). The process
 * refuses to start if any of this fails, instead of surfacing missing
 * config as a runtime error later.
 */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(4000),
  CORS_ORIGINS: Joi.string().allow('').default(''),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  // 32 bytes minimum: a short secret makes HS256 tokens brute-forceable
  // offline. Enforced here so a weak value can never reach production.
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET must be at least 32 characters',
  }),
  // Constrained to the `<number><unit>` form jsonwebtoken accepts (e.g.
  // "30m", "7d"). Validating the shape here is what makes the cast to
  // jsonwebtoken's StringValue type in auth.module.ts sound rather than a
  // blind assertion.
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhdwy]$/)
    .default('7d')
    .messages({
      'string.pattern.base':
        'JWT_EXPIRES_IN must look like 30m, 24h or 7d (number followed by s/m/h/d/w/y)',
    }),
});
