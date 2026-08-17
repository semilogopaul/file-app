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
  readonly storage: {
    /** Endpoint the API itself talks to (inside the Docker network). */
    readonly endpoint: string;
    /**
     * Endpoint baked into presigned URLs. Must be reachable *by the
     * browser*, which cannot resolve Docker service names like
     * `minio:9000`. SigV4 signs the host, so signing with the internal
     * endpoint and rewriting it client-side would invalidate the
     * signature - the two are genuinely separate values.
     */
    readonly publicEndpoint: string;
    readonly region: string;
    readonly accessKey: string;
    readonly secretKey: string;
    readonly bucket: string;
    /** MinIO serves buckets as a path, not a subdomain. */
    readonly forcePathStyle: boolean;
    readonly uploadUrlTtlSeconds: number;
    readonly downloadUrlTtlSeconds: number;
  };
  readonly uploads: {
    readonly maxBytes: number;
    readonly allowedContentTypes: readonly string[];
  };
}

/** Images and PDFs only, per the file-type restriction requirement. */
const DEFAULT_ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

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
  storage: {
    endpoint: process.env.STORAGE_ENDPOINT ?? '',
    publicEndpoint:
      process.env.STORAGE_PUBLIC_ENDPOINT ?? process.env.STORAGE_ENDPOINT ?? '',
    region: process.env.STORAGE_REGION ?? 'us-east-1',
    accessKey: process.env.STORAGE_ACCESS_KEY ?? '',
    secretKey: process.env.STORAGE_SECRET_KEY ?? '',
    bucket: process.env.STORAGE_BUCKET ?? 'file-app',
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE !== 'false',
    uploadUrlTtlSeconds: parseInt(
      process.env.STORAGE_UPLOAD_URL_TTL_SECONDS ?? '900',
      10,
    ),
    downloadUrlTtlSeconds: parseInt(
      process.env.STORAGE_DOWNLOAD_URL_TTL_SECONDS ?? '300',
      10,
    ),
  },
  uploads: {
    maxBytes: parseInt(process.env.UPLOAD_MAX_BYTES ?? '10485760', 10),
    allowedContentTypes: DEFAULT_ALLOWED_CONTENT_TYPES,
  },
});
