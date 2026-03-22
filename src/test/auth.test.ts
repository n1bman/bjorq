import { describe, expect, it } from 'vitest';
import { buildSessionCookie, ensureSecurityDefaults, getAuthStatus, issueSession } from '../../server/security/auth.js';
import { getServiceAccessPolicy } from '../../server/security/accessPolicy.js';

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

  it('allows everyday service domains without admin', () => {
    expect(getServiceAccessPolicy('light')).toEqual({ requiresAdmin: false, reason: null });
    expect(getServiceAccessPolicy('climate')).toEqual({ requiresAdmin: false, reason: null });
  });

  it('requires admin for security-sensitive or unknown domains', () => {
    expect(getServiceAccessPolicy('lock').requiresAdmin).toBe(true);
    expect(getServiceAccessPolicy('scene').requiresAdmin).toBe(true);
    expect(getServiceAccessPolicy('unknown_domain').requiresAdmin).toBe(true);
  });
});
