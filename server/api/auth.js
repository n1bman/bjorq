import { Router } from 'express';
import {
  buildClearedSessionCookie,
  buildSessionCookie,
  getAuthStatusFromRequest,
  getConfigWithSecurity,
  issueSession,
  setupPin,
  updatePin,
  verifyPin,
} from '../security/auth.js';

const router = Router();

router.get('/auth/status', async (req, res) => {
  try {
    res.json(await getAuthStatusFromRequest(req));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/setup', async (req, res) => {
  try {
    const config = await setupPin(req.body?.pin || '');
    const token = issueSession(config);
    res.setHeader('Set-Cookie', buildSessionCookie(req, token));
    res.status(201).json({ configured: true, unlocked: true });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const result = await verifyPin(req.body?.pin || '');
    if (!result.configured) {
      return res.status(409).json({ error: 'PIN is not configured' });
    }
    if (!result.ok) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }
    const token = issueSession(result.config);
    res.setHeader('Set-Cookie', buildSessionCookie(req, token));
    res.json({ configured: true, unlocked: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/logout', async (req, res) => {
  res.setHeader('Set-Cookie', buildClearedSessionCookie(req));
  res.json({ configured: true, unlocked: false });
});

router.post('/auth/change-pin', async (req, res) => {
  try {
    const config = await updatePin(req.body?.currentPin || '', req.body?.nextPin || '');
    const token = issueSession(config);
    res.setHeader('Set-Cookie', buildSessionCookie(req, token));
    res.json({ configured: true, unlocked: true });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.get('/auth/recovery-hint', async (_req, res) => {
  try {
    const config = await getConfigWithSecurity();
    res.json({
      configured: Boolean(config.security.pinHash),
      hint: 'Om PIN glöms bort: stoppa tjänsten, rensa security.pinHash och security.pinSalt i config.json och starta om.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
