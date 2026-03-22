import { describe, expect, it } from 'vitest';
import { buildSessionCookie, ensureSecurityDefaults, getAuthStatus, issueSession } from '../../server/security/auth.js';

describe('auth helpers', () => {
  it('treats unconfigured security as unlocked', () => {
    const status = getAuthStatus({ headers: {} }, ensureSecurityDefaults({}));
    expect(status).toEqual({ configured: false, unlocked: true });
  });

  it('creates a valid session cookie for configured security', () => {
    const config = ensureSecurityDefaults({
      security: {
        pinHash: 'abc',
        pinSalt: 'salt',
      },
    });
    const token = issueSession(config);
    const cookie = buildSessionCookie({ headers: {} }, token);
    const status = getAuthStatus({ headers: { cookie } }, config);
    expect(status).toEqual({ configured: true, unlocked: true });
  });
});
