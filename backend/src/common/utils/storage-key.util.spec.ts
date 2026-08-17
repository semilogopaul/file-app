import { buildStorageKey, sanitiseFilename } from './storage-key.util';

describe('sanitiseFilename', () => {
  it('keeps an already-safe name unchanged', () => {
    expect(sanitiseFilename('report-2026.pdf')).toBe('report-2026.pdf');
  });

  it('replaces spaces and punctuation', () => {
    expect(sanitiseFilename('my photo!! (final).png')).toBe(
      'my-photo-final.png',
    );
  });

  // The important one: a filename is client-supplied, so it must not be
  // able to walk out of the owner's prefix.
  it.each([
    ['../../../etc/passwd.png', 'passwd.png'],
    ['..\\..\\windows\\system32.png', 'system32.png'],
    ['/absolute/path/file.pdf', 'file.pdf'],
  ])('strips directory traversal from %s', (input, expected) => {
    expect(sanitiseFilename(input)).toBe(expected);
  });

  it('falls back to a placeholder when nothing usable remains', () => {
    expect(sanitiseFilename('///')).toBe('file');
    expect(sanitiseFilename('!!!.png')).toBe('file.png');
  });

  it('bounds the length of a very long name', () => {
    const result = sanitiseFilename(`${'a'.repeat(500)}.png`);
    expect(result.length).toBeLessThanOrEqual(112);
    expect(result.endsWith('.png')).toBe(true);
  });
});

describe('buildStorageKey', () => {
  const ownerId = '11111111-1111-4111-8111-111111111111';
  const fileId = '22222222-2222-4222-8222-222222222222';

  it('scopes the key to the owner and file id', () => {
    expect(buildStorageKey({ ownerId, fileId, filename: 'photo.png' })).toBe(
      `users/${ownerId}/${fileId}/photo.png`,
    );
  });

  // Even a hostile filename must stay inside the owner's prefix, otherwise
  // one user could overwrite another's object.
  it('cannot escape the owner prefix via a crafted filename', () => {
    const key = buildStorageKey({
      ownerId,
      fileId,
      filename: '../../other-user/secret.png',
    });

    expect(key).toBe(`users/${ownerId}/${fileId}/secret.png`);
    expect(key).not.toContain('..');
  });
});
