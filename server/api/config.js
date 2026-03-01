import { Router } from 'express';
import { configPath } from '../storage/paths.js';
import { readJSON, writeJSON } from '../storage/readWrite.js';

const router = Router();

const DEFAULT_CONFIG = {
  ha: { baseUrl: '', token: '' },
  ui: { defaultProjectId: 'home', defaultProfile: 'balanced' },
  network: { port: 3000 },
};

async function getConfig() {
  return (await readJSON(configPath())) || { ...DEFAULT_CONFIG };
}

router.get('/config', async (_req, res) => {
  try {
    const cfg = await getConfig();
    // Mask token for frontend
    const masked = { ...cfg, ha: { ...cfg.ha, token: cfg.ha?.token ? '***' : '' } };
    res.json(masked);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Separate secure endpoint for WebSocket init — returns real token
router.get('/config/ws-token', async (_req, res) => {
  try {
    const cfg = await getConfig();
    res.json({ wsUrl: cfg.ha?.baseUrl || '', token: cfg.ha?.token || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/config', async (req, res) => {
  try {
    const existing = await getConfig();
    const merged = { ...existing, ...req.body };
    // Deep merge ha
    if (req.body.ha) merged.ha = { ...existing.ha, ...req.body.ha };
    if (req.body.ui) merged.ui = { ...existing.ui, ...req.body.ui };
    if (req.body.network) merged.network = { ...existing.network, ...req.body.network };
    await writeJSON(configPath(), merged);
    const masked = { ...merged, ha: { ...merged.ha, token: merged.ha?.token ? '***' : '' } };
    res.json(masked);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
