import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { projectDir, assetsDir, assetFilesDir } from '../storage/paths.js';
import { readJSON, writeJSON, ensureDir, listDirs } from '../storage/readWrite.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = path.resolve(__dirname, '../../public/catalog');

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

// Upload model file (GLB) for an asset (legacy building import)
router.post('/projects/:id/assets/upload', upload.single('file'), async (req, res) => {
  try {
    const { type = 'building', name = 'Unnamed', variant = 'balanced' } = req.body;
    const assetId = req.body.assetId || Math.random().toString(36).slice(2, 10);
    const filesDir = assetFilesDir(req.params.id, type, assetId);
    await ensureDir(filesDir);

    const destPath = path.join(filesDir, `${variant}.glb`);
    await fs.rename(req.file.path, destPath);

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

    const modelDest = path.join(filesPath, 'model.glb');
    await fs.rename(modelFile.path, modelDest);

    const thumbFile = files?.thumbnail?.[0];
    let thumbnailPath = null;
    if (thumbFile) {
      const ext = path.extname(thumbFile.originalname) || '.png';
      thumbnailPath = `thumb${ext}`;
      await fs.rename(thumbFile.path, path.join(filesPath, thumbnailPath));
    }

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

// ── Catalog ingest: upload GLB to curated catalog with auto-generated metadata ──
const catalogUpload = multer({ dest: '/tmp/bjorq-uploads' }).fields([
  { name: 'model', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

router.post('/catalog/ingest', catalogUpload, async (req, res) => {
  try {
    const files = req.files;
    const modelFile = files?.model?.[0];
    if (!modelFile) return res.status(400).json({ error: 'No model file provided' });

    const name = req.body.name || 'Unnamed';
    const category = req.body.category || 'imported';
    const subcategory = req.body.subcategory || category;
    const assetId = req.body.assetId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Determine folder path in catalog
    const topLevel = ['devices'].includes(category) ? 'devices' : 'furniture';
    const subFolder = subcategory || category;
    const assetDir = path.join(CATALOG_DIR, topLevel, subFolder, assetId);
    await ensureDir(assetDir);

    // Move model
    await fs.rename(modelFile.path, path.join(assetDir, 'model.glb'));

    // Move thumbnail if provided
    const thumbFile = files?.thumbnail?.[0];
    if (thumbFile) {
      const ext = path.extname(thumbFile.originalname) || '.png';
      const thumbName = `thumb${ext}`;
      await fs.rename(thumbFile.path, path.join(assetDir, thumbName));
    }

    // Write meta.json
    const meta = {
      id: assetId,
      name,
      category,
      subcategory: subcategory !== category ? subcategory : undefined,
      style: req.body.style || undefined,
      tags: req.body.tags ? JSON.parse(req.body.tags) : undefined,
      placement: req.body.placement || 'floor',
      dimensions: req.body.dimensions ? JSON.parse(req.body.dimensions) : undefined,
      performance: req.body.performance ? JSON.parse(req.body.performance) : undefined,
      ha: req.body.ha ? JSON.parse(req.body.ha) : undefined,
    };
    await fs.writeFile(path.join(assetDir, 'meta.json'), JSON.stringify(meta, null, 2));

    // Regenerate index.json
    await regenerateCatalogIndex();

    res.status(201).json({ ok: true, assetId, path: `${topLevel}/${subFolder}/${assetId}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger catalog index regeneration
router.post('/catalog/reindex', async (_req, res) => {
  try {
    await regenerateCatalogIndex();
    const index = await readJSON(path.join(CATALOG_DIR, 'index.json'));
    res.json({ ok: true, count: Array.isArray(index) ? index.length : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve asset files
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

// ── Internal: regenerate index.json by scanning catalog folders ──

const FOLDER_TO_CATEGORY = {
  sofas: 'sofas', chairs: 'chairs', tables: 'tables', beds: 'beds',
  storage: 'storage', lighting: 'lighting', decor: 'decor', plants: 'plants',
  kitchen: 'kitchen', bathroom: 'bathroom', outdoor: 'outdoor',
  lights: 'devices', speakers: 'devices', screens: 'devices', sensors: 'devices',
};

async function scanAssets(dir, relativeTo) {
  const assets = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return assets;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const assetDir = path.join(dir, entry.name);
    const modelPath = path.join(assetDir, 'model.glb');

    try {
      await fs.access(modelPath);
    } catch {
      // Not an asset folder — recurse
      assets.push(...await scanAssets(assetDir, relativeTo));
      continue;
    }

    const relDir = path.relative(relativeTo, assetDir).replace(/\\/g, '/');
    let meta;
    try {
      meta = JSON.parse(await fs.readFile(path.join(assetDir, 'meta.json'), 'utf-8'));
    } catch {
      const parts = relDir.split('/');
      const subcategory = parts.length >= 2 ? parts[parts.length - 2] : 'imported';
      const category = FOLDER_TO_CATEGORY[subcategory] || subcategory;
      meta = {
        id: entry.name,
        name: entry.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        category,
        subcategory,
        placement: 'floor',
      };
      await fs.writeFile(path.join(assetDir, 'meta.json'), JSON.stringify(meta, null, 2));
    }

    let thumbnail = null;
    for (const ext of ['thumb.webp', 'thumb.png', 'thumb.jpg']) {
      try {
        await fs.access(path.join(assetDir, ext));
        thumbnail = `${relDir}/${ext}`;
        break;
      } catch { /* skip */ }
    }

    assets.push({
      id: meta.id || entry.name,
      name: meta.name || entry.name,
      category: meta.category || 'imported',
      subcategory: meta.subcategory,
      style: meta.style,
      tags: meta.tags,
      model: `${relDir}/model.glb`,
      thumbnail,
      dimensions: meta.dimensions,
      placement: meta.placement || 'floor',
      defaultRotation: meta.defaultRotation,
      shadow: meta.shadow,
      ha: meta.ha,
      performance: meta.performance,
      source: 'curated',
    });
  }
  return assets;
}

async function regenerateCatalogIndex() {
  const assets = await scanAssets(CATALOG_DIR, CATALOG_DIR);
  const indexPath = path.join(CATALOG_DIR, 'index.json');
  await fs.writeFile(indexPath, JSON.stringify(assets, null, 2));
  console.log(`[Catalog] Regenerated index.json — ${assets.length} assets`);
}

export default router;
