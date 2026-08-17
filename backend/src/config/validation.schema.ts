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

  // --- Object storage (MinIO locally, any S3-compatible service in prod) ---
  STORAGE_ENDPOINT: Joi.string().uri().required(),
  // Optional: falls back to STORAGE_ENDPOINT when the API and the browser
  // reach storage at the same address (true for real S3, false in Docker).
  STORAGE_PUBLIC_ENDPOINT: Joi.string().uri(),
  STORAGE_REGION: Joi.string().default('us-east-1'),
  STORAGE_ACCESS_KEY: Joi.string().required(),
  STORAGE_SECRET_KEY: Joi.string().required(),
  STORAGE_BUCKET: Joi.string().required(),
  STORAGE_FORCE_PATH_STYLE: Joi.boolean().default(true),
  STORAGE_UPLOAD_URL_TTL_SECONDS: Joi.number().integer().min(60).default(900),
  STORAGE_DOWNLOAD_URL_TTL_SECONDS: Joi.number().integer().min(30).default(300),

  // --- Uploads ---
  // 10MB by default, per the brief. Capped at 100MB so a typo cannot
  // accidentally allow unbounded uploads.
  UPLOAD_MAX_BYTES: Joi.number()
    .integer()
    .min(1)
    .max(104857600)
    .default(10485760),

  // --- Sharing ---
  // Configurable per the brief. Bounded to 30 days: a share link is an
  // unauthenticated bearer credential, so an unbounded lifetime would mean
  // a leaked URL grants access forever.
  SHARE_TOKEN_TTL_SECONDS: Joi.number()
    .integer()
    .min(60)
    .max(2592000)
    .default(86400),

  // Public origin used to build shareable URLs handed to users.
  APP_PUBLIC_URL: Joi.string().uri().default('https://localhost'),
});
