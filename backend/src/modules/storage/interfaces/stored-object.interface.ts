/** Metadata returned by a HEAD against object storage. */
export interface StoredObject {
  readonly key: string;
  readonly sizeBytes: number;
  readonly contentType: string;
}
