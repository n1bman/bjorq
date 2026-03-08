import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { projectDir, assetsDir, assetFilesDir } from '../storage/paths.js';
import { readJSON, writeJSON, ensureDir, listDirs } from '../storage/readWrite.js';

const upload = multer({ dest: '/tmp/bjorq-uploads' });
const router = Router();

// List all assets for a project (optionally filter by type)
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

// Get single asset metadata
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

// Upload model file (GLB) for an asset
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

// Upload prop/furniture asset with full metadata + optional thumbnail
const propUpload = multer({ dest: '/tmp/bjorq-uploads' }).fields([
  { name: 'model', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

router.post('/projects/:id/assets/props/upload', propUpload, async (req, res) => {
  try {
    const files = req.files;
    const modelFile = files?.model?.[0];
    if (!modelFile) return res.status(400).json({ error: 'No model file provided' });

    const assetId = req.body.assetId || Math.random().toString(36).slice(2, 10);
    const category = req.body.category || 'imported';
    const assetDir = path.join(projectDir(req.params.id), 'assets', 'props', assetId);
    const filesPath = path.join(assetDir, 'files');
    await ensureDir(filesPath);

    // Move model file
    const modelDest = path.join(filesPath, 'model.glb');
    await fs.rename(modelFile.path, modelDest);

    // Move thumbnail if provided
    const thumbFile = files?.thumbnail?.[0];
    let thumbnailPath = null;
    if (thumbFile) {
      const ext = path.extname(thumbFile.originalname) || '.png';
      thumbnailPath = `thumb${ext}`;
      await fs.rename(thumbFile.path, path.join(filesPath, thumbnailPath));
    }

    // Parse metadata from body
    const meta = {
      assetId,
      name: req.body.name || 'Unnamed',
      category,
      subcategory: req.body.subcategory || undefined,
      style: req.body.style || undefined,
      tags: req.body.tags ? JSON.parse(req.body.tags) : undefined,
      placement: req.body.placement || 'floor',
      model: 'files/model.glb',
      thumbnail: thumbnailPath ? `files/${thumbnailPath}` : undefined,
      dimensions: req.body.dimensions ? JSON.parse(req.body.dimensions) : undefined,
      performance: req.body.performance ? JSON.parse(req.body.performance) : undefined,
      haMapping: req.body.haMapping ? JSON.parse(req.body.haMapping) : undefined,
      source: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileSizeBytes: modelFile.size,
    };

    await writeJSON(path.join(assetDir, 'asset.json'), meta);

    // Return URL paths the client can use
    res.status(201).json({
      ...meta,
      modelUrl: `/projects/${req.params.id}/assets/props/${assetId}/files/model.glb`,
      thumbnailUrl: thumbnailPath
        ? `/projects/${req.params.id}/assets/props/${assetId}/files/${thumbnailPath}`
        : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve asset files (model.glb, thumb.png etc.)
router.get('/projects/:id/assets/:type/:assetId/files/:filename', async (req, res) => {
  try {
    const filePath = path.join(
      projectDir(req.params.id), 'assets',
      req.params.type, req.params.assetId, 'files',
      req.params.filename
    );
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch {
    res.status(404).json({ error: 'File not found' });
  }
});

// Delete a prop asset
router.delete('/projects/:id/assets/props/:assetId', async (req, res) => {
  try {
    const assetDir = path.join(projectDir(req.params.id), 'assets', 'props', req.params.assetId);
    await fs.rm(assetDir, { recursive: true, force: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
