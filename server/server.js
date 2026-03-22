import express from 'express';
import path from 'path';
import { configPath, dataDir, distDir, profilesPath, projectsDir } from './storage/paths.js';
import { ensureDir, readJSON, writeJSON } from './storage/readWrite.js';
import bootstrapRouter from './api/bootstrap.js';
import authRouter from './api/auth.js';
import liveRouter from './api/live.js';
import configRouter from './api/config.js';
import profilesRouter from './api/profiles.js';
import assetsRouter from './api/assets.js';
import projectsRouter from './api/projects.js';
import haProxyRouter from './api/haProxy.js';
import backupsRouter from './api/backups.js';
import { ensureSecurityDefaults } from './security/auth.js';
import { haLiveHub } from './ha/liveHub.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));

app.use('/api', bootstrapRouter);
app.use('/api', authRouter);
app.use('/api', liveRouter);
app.use('/api', configRouter);
app.use('/api', profilesRouter);
app.use('/api', assetsRouter);
app.use('/api', projectsRouter);
app.use('/api', haProxyRouter);
app.use('/api', backupsRouter);

app.use('/projects', express.static(path.join(dataDir(), 'projects')));

const dist = distDir();
app.use(express.static(dist));

app.get('*', (_req, res) => {
  res.sendFile(path.join(dist, 'index.html'));
});

async function bootstrap() {
  await ensureDir(dataDir());
  await ensureDir(projectsDir());

  const existingConfig = await readJSON(configPath());
  if (!existingConfig) {
    await writeJSON(configPath(), ensureSecurityDefaults({
      ha: { baseUrl: '', token: '' },
      ui: { defaultProjectId: 'home', defaultProfile: 'balanced' },
      network: { port: PORT },
    }));
    console.log('[Boot] Created default config.json');
  } else {
    await writeJSON(configPath(), ensureSecurityDefaults(existingConfig));
  }

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

bootstrap().then(async () => {
  await haLiveHub.connect().catch((err) => console.warn('[Boot] Failed to connect HA live hub:', err.message));
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  bjorQ Dashboard Server`);
    console.log(`  ---------------------`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Network: http://0.0.0.0:${PORT}`);
    console.log(`  Data:    ${dataDir()}\n`);
  });
});
