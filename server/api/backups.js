import { Router } from 'express';
import path from 'path';
import { dataDir, profilesPath } from '../storage/paths.js';
import { readJSON, writeJSON, ensureDir } from '../storage/readWrite.js';

const router = Router();

router.post('/backup', async (_req, res) => {
  try {
    const backupsDir = path.join(dataDir(), 'backups');
    await ensureDir(backupsDir);

    const profiles = await readJSON(profilesPath());
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `bjorq-backup-${timestamp}.json`;

    await writeJSON(path.join(backupsDir, filename), {
      _meta: { version: '0.1.5', createdAt: new Date().toISOString() },
      profiles,
    });

    res.json({ ok: true, filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
