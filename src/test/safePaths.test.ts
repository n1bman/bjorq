import { describe, expect, it } from 'vitest';
import { assertSafeFilename, assertSafeSegment, resolveInside } from '../../server/storage/safePaths.js';

describe('safePaths', () => {
  it('accepts simple ids and filenames', () => {
    expect(assertSafeSegment('home_1')).toBe('home_1');
    expect(assertSafeFilename('model.glb')).toBe('model.glb');
  });

  it('rejects traversal-like segments', () => {
    expect(() => assertSafeSegment('../escape')).toThrow(/Invalid/);
    expect(() => assertSafeFilename('..\\evil.txt')).toThrow(/Invalid/);
  });

  it('keeps resolved paths inside root', () => {
    expect(resolveInside('C:/tmp/root', 'foo', 'bar')).toContain('root');
    expect(() => resolveInside('C:/tmp/root', '..', 'evil')).toThrow(/escapes allowed root/);
  });
});
