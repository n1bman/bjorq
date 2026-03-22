import { Router } from 'express';
import { profilesPath } from '../storage/paths.js';
import { readJSON, writeJSON } from '../storage/readWrite.js';
import { requireAdmin } from '../security/auth.js';

const router = Router();

export const DEFAULT_PROFILES = {
  profile: { name: '', theme: 'dark', accentColor: '#f59e0b', dashboardBg: 'scene3d' },
  performance: { quality: 'high', shadows: true, postprocessing: false, tabletMode: false },
  standby: { enabled: false, idleMinutes: 2, cameraView: 'standard' },
  homeView: {
    cameraPreset: 'angle',
    visibleWidgets: { clock: true, weather: true, temperature: true, energy: true, calendar: true },
    homeScreenDevices: [],
    showDeviceMarkers: true,
  },
  environment: {
    source: 'auto',
    location: { lat: 59.33, lon: 18.07, timezone: 'Europe/Stockholm' },
    timeMode: 'live',
    previewDateTime: new Date().toISOString(),
    weather: { condition: 'clear', temperature: 18, intensity: 0 },
    sunAzimuth: 135,
    sunElevation: 45,
  },
  customCategories: [],
};

router.get('/profiles', async (_req, res) => {
  try {
    const data = (await readJSON(profilesPath())) || { ...DEFAULT_PROFILES };
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profiles', requireAdmin, async (req, res) => {
  try {
    await writeJSON(profilesPath(), req.body);
    res.json(req.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
