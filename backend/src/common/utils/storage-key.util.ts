import { extname } from 'path';

/** Chars that are unsafe or awkward in an object key / download filename. */
const UNSAFE_CHARS = /[^a-zA-Z0-9._-]+/g;
const MAX_BASENAME_LENGTH = 100;

/**
 * Reduces a client-supplied filename to something safe to embed in a
 * storage key. Strips any directory component (so "../../etc/passwd"
 * cannot escape the prefix), collapses unsafe characters, and bounds the
 * length.
 */
export function sanitiseFilename(filename: string): string {
  // Cut at both separators: a Windows client can send backslashes, which
  // POSIX basename() would treat as an ordinary character.
  const withoutPath = filename.split(/[\\/]/).pop() ?? '';
  const extension = extname(withoutPath).slice(0, 12);
  const base = withoutPath.slice(0, withoutPath.length - extension.length);

  const safeBase =
    base
      .replace(UNSAFE_CHARS, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, MAX_BASENAME_LENGTH) || 'file';
  const safeExtension = extension.replace(UNSAFE_CHARS, '');

  return `${safeBase}${safeExtension}`;
}

/**
 * Builds the object key for an upload.
 *
 * Always derived server-side from the authenticated user and a freshly
 * generated file id. A client-supplied key would let one user overwrite
 * another's object, and the owner prefix means even a leaked key is
 * obviously scoped to its owner.
 */
export function buildStorageKey({
  ownerId,
  fileId,
  filename,
}: {
  ownerId: string;
  fileId: string;
  filename: string;
}): string {
  return `users/${ownerId}/${fileId}/${sanitiseFilename(filename)}`;
}

/** Thumbnails live beside the original under a distinct prefix. */
export function buildThumbnailKey({
  ownerId,
  fileId,
}: {
  ownerId: string;
  fileId: string;
}): string {
  return `users/${ownerId}/${fileId}/thumbnail.webp`;
}
