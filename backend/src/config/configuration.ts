export interface AppConfig {
  readonly env: string;
  readonly port: number;
  readonly cors: {
    readonly origins: readonly string[];
  };
  readonly database: {
    readonly url: string;
  };
  readonly jwt: {
    readonly secret: string;
    readonly expiresIn: string;
  };
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  cors: {
    origins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
});
