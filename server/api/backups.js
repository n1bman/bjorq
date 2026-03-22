import { Router } from 'express';
import path from 'path';
import { configPath, dataDir, profilesPath, projectFilePath, projectsDir } from '../storage/paths.js';
import { ensureDir, listDirs, readJSON, writeJSON } from '../storage/readWrite.js';
import { requireAdmin } from '../security/auth.js';
import { DEFAULT_PROFILES } from './profiles.js';
import { safeProjectDir, safeProjectId, safeProjectPath } from '../storage/safePaths.js';
import { BACKUP_SCHEMA_VERSION, normalizeBackupEnvelope } from '../storage/backupEnvelope.js';

const router = Router();
const APP_VERSION = process.env.npm_package_version || '1.8.2';

async function buildBackupEnvelope() {
  const profiles = (await readJSON(profilesPath())) || {};
  const config = (await readJSON(configPath())) || {};
  const ids = await listDirs(projectsDir());
  const projects = [];

  for (const id of ids) {
    const data = await readJSON(projectFilePath(id));
    if (data) projects.push({ id, ...data });
  }

  return {
    _meta: { schemaVersion: BACKUP_SCHEMA_VERSION, version: APP_VERSION, createdAt: new Date().toISOString() },
    config: {
      ui: config.ui || {},
      network: config.network || {},
      ha: {
        baseUrl: config.ha?.baseUrl || '',
        token: '',
      },
    },
    profiles,
    projects,
    activeProjectId: config.ui?.defaultProjectId || projects[0]?.id || 'home',
  };
}

async function createServerBackupSnapshot(prefix = 'bjorq-backup') {
  const backupsDir = path.join(dataDir(), 'backups');
  await ensureDir(backupsDir);

  const envelope = await buildBackupEnvelope();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${prefix}-${timestamp}.json`;

  await writeJSON(path.join(backupsDir, filename), envelope);
  return filename;
}

router.get('/backup/export', requireAdmin, async (_req, res) => {
  try {
    res.json(await buildBackupEnvelope());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/backup', requireAdmin, async (_req, res) => {
  try {
    const filename = await createServerBackupSnapshot('bjorq-backup');
    res.json({ ok: true, filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/backup/restore', requireAdmin, async (req, res) => {
  try {
    const payload = normalizeBackupEnvelope(req.body || {});
    const profiles = payload.profiles || {};
    const projects = payload.projects;
    const activeProjectId = safeProjectId(payload.activeProjectId || projects[0]?.id || 'home');
    const existingConfig = (await readJSON(configPath())) || {};
    const fs = await import('fs/promises');
    const snapshotFilename = await createServerBackupSnapshot('pre-restore-backup');

    await writeJSON(profilesPath(), profiles);

    const existingProjectIds = await listDirs(projectsDir());
    for (const projectId of existingProjectIds) {
      await fs.rm(safeProjectDir(projectId), { recursive: true, force: true });
    }

    for (const project of projects) {
      const projectId = safeProjectId(project.id || 'home');
      const next = { ...project };
      delete next.id;
      await ensureDir(safeProjectDir(projectId));
      await writeJSON(safeProjectPath(projectId, 'project.json'), next);
    }

    const restoredConfig = {
      ...existingConfig,
      ui: {
        ...existingConfig.ui,
        ...(payload.config?.ui || {}),
        defaultProjectId: activeProjectId,
      },
      network: {
        ...existingConfig.network,
        ...(payload.config?.network || {}),
      },
      ha: {
        ...existingConfig.ha,
        baseUrl: payload.config?.ha?.baseUrl || existingConfig.ha?.baseUrl || '',
      },
      security: existingConfig.security,
    };

    await writeJSON(configPath(), restoredConfig);
    res.json({ ok: true, activeProjectId, restoredProjects: projects.length, snapshotFilename });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.post('/backup/reset', requireAdmin, async (_req, res) => {
  try {
    const existingConfig = (await readJSON(configPath())) || {};
    const existingProjectIds = await listDirs(projectsDir());
    const fs = await import('fs/promises');
    const snapshotFilename = await createServerBackupSnapshot('pre-reset-backup');

    await writeJSON(profilesPath(), DEFAULT_PROFILES);

    for (const projectId of existingProjectIds) {
      await fs.rm(safeProjectDir(projectId), { recursive: true, force: true });
    }

    await writeJSON(configPath(), {
      ...existingConfig,
      ha: { baseUrl: '', token: '' },
      ui: { ...(existingConfig.ui || {}), defaultProjectId: 'home', defaultProfile: 'balanced' },
      network: existingConfig.network || {},
      security: existingConfig.security,
    });

    res.json({ ok: true, snapshotFilename });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

export default router;
