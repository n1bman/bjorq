import crypto from 'crypto';
import { configPath } from '../storage/paths.js';
import { readJSON, writeJSON } from '../storage/readWrite.js';
import { getAccessPolicySummary } from './accessPolicy.js';

const COOKIE_NAME = 'bjorq_admin';
const PIN_MIN_LENGTH = 4;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function ensureSecurityDefaults(config = {}) {
  const next = {
    ...config,
    security: {
      pinHash: '',
      pinSalt: '',
      sessionSecret: '',
      ...config.security,
    },
  };

  if (!next.security.sessionSecret) {
    next.security.sessionSecret = crypto.randomBytes(32).toString('hex');
  }

  return next;
}

export async function getConfigWithSecurity() {
  const config = ensureSecurityDefaults((await readJSON(configPath())) || {});
  return config;
}

export async function saveConfigWithSecurity(config) {
  await writeJSON(configPath(), ensureSecurityDefaults(config));
}

export function maskSecurity(config) {
  const safe = ensureSecurityDefaults(config);
  return {
    ...safe,
    ha: {
      ...safe.ha,
      token: safe.ha?.token ? '***' : '',
    },
    security: {
      configured: Boolean(safe.security.pinHash),
    },
  };
}

function hashPin(pin, salt) {
  return crypto.scryptSync(pin, salt, 64).toString('hex');
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.split('=');
        return [key, decodeURIComponent(rest.join('='))];
      })
  );
}

function signSession(payload, secret) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySession(token, secret) {
  if (!token || !secret || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body));
    if (!payload?.exp || payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function buildSessionCookie(req, token, maxAgeSeconds = SESSION_MAX_AGE_SECONDS) {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isSecure) attrs.push('Secure');
  return attrs.join('; ');
}

export function buildClearedSessionCookie(req) {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const attrs = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (isSecure) attrs.push('Secure');
  return attrs.join('; ');
}

export function getAuthStatus(req, config) {
  const safeConfig = ensureSecurityDefaults(config);
  const configured = Boolean(safeConfig.security.pinHash);
  if (!configured) {
    return { configured: false, unlocked: true };
  }
  const cookies = parseCookies(req);
  const session = verifySession(cookies[COOKIE_NAME], safeConfig.security.sessionSecret);
  return { configured: true, unlocked: Boolean(session) };
}

export async function getAuthStatusFromRequest(req) {
  const config = await getConfigWithSecurity();
  return getAuthStatus(req, config);
}

export function buildAuthPayload(req, config) {
  return {
    ...getAuthStatus(req, config),
    policy: getAccessPolicySummary(),
  };
}

export async function requireAdmin(req, res, next) {
  try {
    const config = await getConfigWithSecurity();
    const auth = buildAuthPayload(req, config);
    if (!auth.unlocked) {
      return res.status(401).json({ error: 'Admin unlock required', auth });
    }
    req.bjorqConfig = config;
    return next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function setupPin(pin) {
  if (typeof pin !== 'string' || pin.trim().length < PIN_MIN_LENGTH) {
    const err = new Error(`PIN must be at least ${PIN_MIN_LENGTH} characters`);
    err.statusCode = 400;
    throw err;
  }

  const config = await getConfigWithSecurity();
  if (config.security.pinHash) {
    const err = new Error('PIN is already configured');
    err.statusCode = 409;
    throw err;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  config.security.pinSalt = salt;
  config.security.pinHash = hashPin(pin.trim(), salt);
  await saveConfigWithSecurity(config);
  return config;
}

export async function verifyPin(pin) {
  const config = await getConfigWithSecurity();
  if (!config.security.pinHash || !config.security.pinSalt) {
    return { ok: true, configured: false, config };
  }

  if (typeof pin !== 'string') return { ok: false, configured: true, config };
  const actual = Buffer.from(hashPin(pin.trim(), config.security.pinSalt), 'hex');
  const expected = Buffer.from(config.security.pinHash, 'hex');
  const ok = actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  return { ok, configured: true, config };
}

export function issueSession(config) {
  const payload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  return signSession(payload, ensureSecurityDefaults(config).security.sessionSecret);
}

export async function updatePin(currentPin, nextPin) {
  const { ok, config } = await verifyPin(currentPin);
  if (!ok) {
    const err = new Error('Current PIN is incorrect');
    err.statusCode = 401;
    throw err;
  }
  if (typeof nextPin !== 'string' || nextPin.trim().length < PIN_MIN_LENGTH) {
    const err = new Error(`PIN must be at least ${PIN_MIN_LENGTH} characters`);
    err.statusCode = 400;
    throw err;
  }
  const salt = crypto.randomBytes(16).toString('hex');
  config.security.pinSalt = salt;
  config.security.pinHash = hashPin(nextPin.trim(), salt);
  await saveConfigWithSecurity(config);
  return config;
}
