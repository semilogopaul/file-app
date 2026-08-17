import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StoredObject } from './interfaces/stored-object.interface';

/**
 * The only place the API talks to object storage.
 *
 * Note what is absent: any method that streams file *contents* through this
 * process. Uploads and downloads both happen browser-to-storage via
 * presigned URLs; the API only ever signs URLs and reads object metadata
 * (HEAD). That is what keeps file bytes off the server, as the brief
 * requires.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  /** Talks to storage over the internal network (HEAD, bucket ops). */
  private readonly internalClient: S3Client;

  /**
   * Used only to *sign* URLs. Configured with the browser-reachable
   * endpoint because SigV4 signs the Host header - a URL signed against
   * the internal endpoint would fail signature validation once the browser
   * requested it from a different host.
   */
  private readonly signingClient: S3Client;

  private readonly bucket: string;
  private readonly uploadUrlTtl: number;
  private readonly downloadUrlTtl: number;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.getOrThrow<string>('storage.region');
    const forcePathStyle = this.configService.getOrThrow<boolean>(
      'storage.forcePathStyle',
    );
    const credentials = {
      accessKeyId: this.configService.getOrThrow<string>('storage.accessKey'),
      secretAccessKey:
        this.configService.getOrThrow<string>('storage.secretKey'),
    };

    this.internalClient = new S3Client({
      endpoint: this.configService.getOrThrow<string>('storage.endpoint'),
      region,
      credentials,
      forcePathStyle,
    });

    this.signingClient = new S3Client({
      endpoint: this.configService.getOrThrow<string>('storage.publicEndpoint'),
      region,
      credentials,
      forcePathStyle,
      // Without this the SDK adds a CRC32 checksum of an *empty* body to
      // every presigned PUT (x-amz-checksum-crc32=AAAAAA==). The browser
      // then uploads real bytes whose checksum does not match, which S3
      // rejects. MinIO happens to tolerate it; real S3 does not.
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });

    this.bucket = this.configService.getOrThrow<string>('storage.bucket');
    this.uploadUrlTtl = this.configService.getOrThrow<number>(
      'storage.uploadUrlTtlSeconds',
    );
    this.downloadUrlTtl = this.configService.getOrThrow<number>(
      'storage.downloadUrlTtlSeconds',
    );
  }

  /**
   * Presigned PUT the browser uploads to directly.
   *
   * `contentType` is part of the signature, so the client cannot upload a
   * different type than the one approved at init - that is what makes the
   * images/PDF restriction a server-side control rather than a client-side
   * suggestion.
   */
  createUploadUrl({
    key,
    contentType,
  }: {
    key: string;
    contentType: string;
  }): Promise<string> {
    return getSignedUrl(
      this.signingClient,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      {
        expiresIn: this.uploadUrlTtl,
        // Essential, and easy to miss: by default the presigner signs only
        // `host`, so ContentType above would be a hint the client could
        // ignore. Naming it here puts Content-Type in the signature, so
        // uploading a different type fails at storage with a 403. That is
        // what makes the images/PDF restriction a real server-side control.
        signableHeaders: new Set(['content-type']),
      },
    );
  }

  /**
   * Short-lived presigned GET. `downloadName` drives a
   * Content-Disposition on the response so the browser saves the file
   * under its original name rather than the opaque storage key.
   */
  createDownloadUrl({
    key,
    downloadName,
    inline = false,
    expiresInSeconds,
  }: {
    key: string;
    downloadName?: string;
    inline?: boolean;
    expiresInSeconds?: number;
  }): Promise<string> {
    return getSignedUrl(
      this.signingClient,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(downloadName
          ? {
              ResponseContentDisposition: `${
                inline ? 'inline' : 'attachment'
              }; filename="${encodeURIComponent(downloadName)}"`,
            }
          : {}),
      }),
      { expiresIn: expiresInSeconds ?? this.downloadUrlTtl },
    );
  }

  /**
   * Metadata-only lookup used to confirm an upload actually landed.
   * Returns null when the object is absent, so callers distinguish "not
   * uploaded" from a genuine storage outage (which still throws).
   */
  async statObject(key: string): Promise<StoredObject | null> {
    try {
      const response = await this.internalClient.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );

      return {
        key,
        sizeBytes: response.ContentLength ?? 0,
        contentType: response.ContentType ?? 'application/octet-stream',
      };
    } catch (error) {
      if (this.isNotFound(error)) {
        return null;
      }

      // A real storage failure must not be mistaken for "file missing",
      // which would let us mark a good upload as failed.
      this.logger.error(
        `HEAD failed for ${key}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private isNotFound(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const { name } = error as { name?: string };
    const statusCode = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;

    return name === 'NotFound' || name === 'NoSuchKey' || statusCode === 404;
  }
}
