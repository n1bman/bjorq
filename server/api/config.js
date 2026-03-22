import { Router } from 'express';
import { configPath } from '../storage/paths.js';
import { writeJSON } from '../storage/readWrite.js';
import { getAuthStatus, getConfigWithSecurity, maskSecurity, requireAdmin } from '../security/auth.js';
import { haLiveHub } from '../ha/liveHub.js';

const router = Router();

async function getConfig() {
  return getConfigWithSecurity();
}

router.get('/config', async (req, res) => {
  try {
    const cfg = await getConfig();
    res.json({ ...maskSecurity(cfg), auth: getAuthStatus(req, cfg) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/config', requireAdmin, async (req, res) => {
  try {
    const existing = await getConfig();
    const body = { ...req.body };
    delete body.security;

    const merged = { ...existing, ...body };
    if (body.ha) merged.ha = { ...existing.ha, ...body.ha };
    if (body.ui) merged.ui = { ...existing.ui, ...body.ui };
    if (body.network) merged.network = { ...existing.network, ...body.network };
    merged.security = existing.security;

    await writeJSON(configPath(), merged);
    await haLiveHub.reconnect();

    res.json({ ...maskSecurity(merged), auth: getAuthStatus(req, merged) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
