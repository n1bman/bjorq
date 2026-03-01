import express from 'express';
import path from 'path';
import { dataDir, configPath, profilesPath, projectsDir, distDir } from './storage/paths.js';
import { ensureDir, readJSON, writeJSON } from './storage/readWrite.js';
import configRouter from './api/config.js';
import profilesRouter from './api/profiles.js';
import projectsRouter from './api/projects.js';
import assetsRouter from './api/assets.js';
import haProxyRouter from './api/haProxy.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(express.json({ limit: '50mb' }));

// API routes
app.use('/api', configRouter);
app.use('/api', profilesRouter);
app.use('/api', assetsRouter);
app.use('/api', projectsRouter);
app.use('/api', haProxyRouter);

// Serve GLB assets from data/projects/
app.use('/projects', express.static(path.join(dataDir(), 'projects')));

// Serve frontend build
const dist = distDir();
app.use(express.static(dist));

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(dist, 'index.html'));
});

// Bootstrap data directory
async function bootstrap() {
  await ensureDir(dataDir());
  await ensureDir(projectsDir());

  // Create default config if missing
  if (!(await readJSON(configPath()))) {
    await writeJSON(configPath(), {
      ha: { baseUrl: '', token: '' },
      ui: { defaultProjectId: 'home', defaultProfile: 'balanced' },
      network: { port: PORT },
    });
    console.log('[Boot] Created default config.json');
  }

  // Create default profiles if missing
  if (!(await readJSON(profilesPath()))) {
    await writeJSON(profilesPath(), {
      profile: { name: '', theme: 'dark', accentColor: '#f59e0b', dashboardBg: 'scene3d' },
      performance: { quality: 'high', shadows: true, postprocessing: false, tabletMode: false },
      standby: { enabled: false, idleMinutes: 2, cameraView: 'standard' },
      homeView: {
        cameraPreset: 'angle',
        visibleWidgets: { clock: true, weather: true, temperature: true, energy: true, calendar: true },
        homeScreenDevices: [],
        showDeviceMarkers: true,
      },
    });
    console.log('[Boot] Created default profiles.json');
  }
}

bootstrap().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  bjorQ Dashboard Server`);
    console.log(`  ─────────────────────`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Network: http://0.0.0.0:${PORT}`);
    console.log(`  Data:    ${dataDir()}\n`);
  });
});
