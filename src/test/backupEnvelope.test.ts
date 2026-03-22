import { describe, expect, it } from 'vitest';
import { normalizeBackupEnvelope } from '../../server/storage/backupEnvelope.js';

describe('backup envelope', () => {
  it('normalizes a valid payload', () => {
    const normalized = normalizeBackupEnvelope({
      _meta: { version: '1.8.2', createdAt: '2026-03-22T18:00:00.000Z' },
      config: { ui: { defaultProjectId: 'hem' }, network: { port: 3000 }, ha: { baseUrl: 'http://ha.local', token: 'secret' } },
      profiles: { profile: { name: 'Anton' } },
      projects: [{ id: 'hem', layout: { floors: [] } }],
      activeProjectId: 'hem',
    });

    expect(normalized.activeProjectId).toBe('hem');
    expect(normalized.config.ha.token).toBe('');
    expect(normalized.projects).toHaveLength(1);
  });

  it('rejects invalid project collections', () => {
    expect(() => normalizeBackupEnvelope({ projects: {} })).toThrow(/projects array/);
  });

  it('rejects duplicate project ids after normalization', () => {
    expect(() =>
      normalizeBackupEnvelope({
        projects: [
          { id: 'home' },
          { id: 'home' },
        ],
      })
    ).toThrow(/Duplicate project id/);
  });
});
