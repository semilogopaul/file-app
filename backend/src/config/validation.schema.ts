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
});
