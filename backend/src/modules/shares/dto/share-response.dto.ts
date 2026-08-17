/** Returned once, when a share link is created. */
export class ShareLinkResponseDto {
  /** Raw token - never stored server-side, only its SHA-256 hash is. */
  readonly token!: string;
  /** Full URL, ready to put on the clipboard. */
  readonly url!: string;
  readonly expiresAt!: Date;
}

/**
 * Public view of a shared file. Deliberately minimal: no owner, no folder,
 * no ids. Someone holding a share link should learn about that one file and
 * nothing about the account it belongs to.
 */
export class SharedFileResponseDto {
  readonly name!: string;
  readonly sizeBytes!: number;
  readonly contentType!: string;
  readonly downloadUrl!: string;
  readonly expiresAt!: Date;
}
