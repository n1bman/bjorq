import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { projectDir, assetsDir, assetFilesDir } from '../storage/paths.js';
import { readJSON, writeJSON, ensureDir, listDirs } from '../storage/readWrite.js';

const upload = multer({ dest: '/tmp/bjorq-uploads' });
const router = Router();

router.get('/projects/:id/assets', async (req, res) => {
  try {
    const typeFilter = req.query.type;
    const assetsBase = path.join(projectDir(req.params.id), 'assets');
    const types = typeFilter ? [typeFilter] : await listDirs(assetsBase);
    const assets = [];
    for (const type of types) {
      const typeDir = path.join(assetsBase, type);
      const assetIds = await listDirs(typeDir);
      for (const assetId of assetIds) {
        const meta = await readJSON(path.join(typeDir, assetId, 'asset.json'));
        if (meta) assets.push({ ...meta, type, assetId });
      }
    }
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/projects/:id/assets/:assetId', async (req, res) => {
  try {
    const assetsBase = path.join(projectDir(req.params.id), 'assets');
    const types = await listDirs(assetsBase);
    for (const type of types) {
      const meta = await readJSON(path.join(assetsBase, type, req.params.assetId, 'asset.json'));
      if (meta) return res.json({ ...meta, type, assetId: req.params.assetId });
    }
    res.status(404).json({ error: 'Asset not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/projects/:id/assets/upload', upload.single('file'), async (req, res) => {
  try {
    const { type = 'building', name = 'Unnamed', variant = 'balanced' } = req.body;
    const assetId = req.body.assetId || Math.random().toString(36).slice(2, 10);
    const filesDir = assetFilesDir(req.params.id, type, assetId);
    await ensureDir(filesDir);

    // Move uploaded file
    const destPath = path.join(filesDir, `${variant}.glb`);
    await fs.rename(req.file.path, destPath);

    // Update asset.json
    const metaPath = path.join(assetsDir(req.params.id, type, assetId), 'asset.json');
    const existing = (await readJSON(metaPath)) || { name, type, assetId, variants: {} };
    existing.name = name;
    existing.variants = existing.variants || {};
    existing.variants[variant] = { file: `${variant}.glb`, size: req.file.size };
    existing.updatedAt = new Date().toISOString();
    await writeJSON(metaPath, existing);

    res.status(201).json(existing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
