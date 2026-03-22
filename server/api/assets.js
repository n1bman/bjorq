import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { projectDir, assetsDir, assetFilesDir } from '../storage/paths.js';
import { readJSON, writeJSON, ensureDir, listDirs } from '../storage/readWrite.js';
import { requireAdmin } from '../security/auth.js';
import { assertSafeFilename, assertSafeSegment, resolveInside, safeProjectId, safeProjectPath } from '../storage/safePaths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = path.resolve(__dirname, '../../public/catalog');

const upload = multer({ dest: '/tmp/bjorq-uploads' });
const router = Router();

// ── Helpers ──

/** Generate a unique slug by appending -2, -3, etc. if folder exists */
async function uniqueSlug(baseDir, slug) {
  let candidate = slug;
  let counter = 1;
  while (true) {
    try {
      await fs.access(path.join(baseDir, candidate));
      counter++;
      candidate = `${slug}-${counter}`;
    } catch {
      return candidate; // doesn't exist → unique
    }
  }
}

/** Check if file looks like a GLB (by extension or magic bytes) */
function isGLB(file) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ext === '.glb') return true;
  // Also accept by mimetype
  if (file.mimetype === 'model/gltf-binary') return true;
  return false;
}

/** Find a curated asset folder by ID (scans catalog tree) */
async function findCatalogAssetDir(assetId) {
  async function search(dir) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return null; }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (entry.name === assetId) {
        // Verify it has model.glb
        try { await fs.access(path.join(full, 'model.glb')); return full; } catch { /* continue */ }
      }
      const found = await search(full);
      if (found) return found;
    }
    return null;
  }
  return search(CATALOG_DIR);
}

// ── Project asset routes ──

router.get('/projects/:id/assets', async (req, res) => {
  try {
    const projectId = safeProjectId(req.params.id);
    const typeFilter = req.query.type;
    const assetsBase = safeProjectPath(projectId, 'assets');
    const types = typeFilter ? [assertSafeSegment(String(typeFilter), 'asset type')] : await listDirs(assetsBase);
    const assets = [];
    for (const type of types) {
      const typeDir = resolveInside(assetsBase, assertSafeSegment(type, 'asset type'));
      const assetIds = await listDirs(typeDir);
      for (const assetId of assetIds) {
        const meta = await readJSON(resolveInside(typeDir, assertSafeSegment(assetId, 'asset id'), 'asset.json'));
        if (meta) assets.push({ ...meta, type, assetId });
      }
    }
    res.json(assets);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.get('/projects/:id/assets/:assetId', async (req, res) => {
  try {
    const projectId = safeProjectId(req.params.id);
    const assetId = assertSafeSegment(req.params.assetId, 'asset id');
    const assetsBase = safeProjectPath(projectId, 'assets');
    const types = await listDirs(assetsBase);
    for (const type of types) {
      const meta = await readJSON(resolveInside(assetsBase, assertSafeSegment(type, 'asset type'), assetId, 'asset.json'));
      if (meta) return res.json({ ...meta, type, assetId });
    }
    res.status(404).json({ error: 'Asset not found' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.post('/projects/:id/assets/upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const projectId = safeProjectId(req.params.id);
    const { type = 'building', name = 'Unnamed', variant = 'balanced' } = req.body;
    const safeType = assertSafeSegment(type, 'asset type');
    const safeVariant = assertSafeFilename(`${variant}.glb`, 'asset variant');
    const assetId = assertSafeSegment(req.body.assetId || Math.random().toString(36).slice(2, 10), 'asset id');
    const filesDir = assetFilesDir(projectId, safeType, assetId);
    await ensureDir(filesDir);

    const destPath = path.join(filesDir, safeVariant);
    await fs.rename(req.file.path, destPath);

    const metaPath = path.join(assetsDir(projectId, safeType, assetId), 'asset.json');
    const existing = (await readJSON(metaPath)) || { name, type: safeType, assetId, variants: {} };
    existing.name = name;
    existing.variants = existing.variants || {};
    existing.variants[variant] = { file: safeVariant, size: req.file.size };
    existing.updatedAt = new Date().toISOString();
    await writeJSON(metaPath, existing);

    res.status(201).json(existing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Prop upload ──

const propUpload = multer({ dest: '/tmp/bjorq-uploads' }).fields([
  { name: 'model', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

router.post('/projects/:id/assets/props/upload', requireAdmin, propUpload, async (req, res) => {
  try {
    const files = req.files;
    const modelFile = files?.model?.[0];
    if (!modelFile) return res.status(400).json({ error: 'No model file provided' });

    const projectId = safeProjectId(req.params.id);
    const assetId = assertSafeSegment(req.body.assetId || Math.random().toString(36).slice(2, 10), 'asset id');
    const category = req.body.category || 'imported';
    const assetDir = safeProjectPath(projectId, 'assets', 'props', assetId);
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
      modelUrl: `/projects/${projectId}/assets/props/${assetId}/files/model.glb`,
      thumbnailUrl: thumbnailPath
        ? `/projects/${projectId}/assets/props/${assetId}/files/${thumbnailPath}`
        : undefined,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// ── Catalog ingest ──

const catalogUpload = multer({ dest: '/tmp/bjorq-uploads' }).fields([
  { name: 'model', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

router.post('/catalog/ingest', requireAdmin, catalogUpload, async (req, res) => {
  try {
    const files = req.files;
    const modelFile = files?.model?.[0];
    if (!modelFile) return res.status(400).json({ error: 'No model file provided' });

    // Validate GLB
    if (!isGLB(modelFile)) {
      // Clean up temp file
      try { await fs.unlink(modelFile.path); } catch { /* ignore */ }
      return res.status(400).json({ error: 'Only .glb files are accepted' });
    }

    const name = req.body.name || 'Unnamed';
    const category = req.body.category || 'imported';
    const subcategory = req.body.subcategory || category;
    const baseSlug = req.body.assetId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const topLevel = ['devices'].includes(category) ? 'devices' : 'furniture';
    const subFolder = subcategory || category;
    const parentDir = path.join(CATALOG_DIR, topLevel, subFolder);
    await ensureDir(parentDir);

    const force = req.query.force === 'true';

    // Check collision
    const assetId = force ? baseSlug : await uniqueSlug(parentDir, baseSlug);

    // If not forced and slug already existed (meaning uniqueSlug changed it), that's fine.
    // But if force=false and the exact baseSlug exists, return 409
    if (!force && assetId !== baseSlug) {
      // Slug was adjusted — proceed with the new unique slug
    } else if (!force) {
      try {
        await fs.access(path.join(parentDir, baseSlug));
        // Exists — return conflict
        const existingMeta = await readJSON(path.join(parentDir, baseSlug, 'meta.json'));
        // Clean up temp files
        try { await fs.unlink(modelFile.path); } catch { /* ignore */ }
        const thumbFile = files?.thumbnail?.[0];
        if (thumbFile) try { await fs.unlink(thumbFile.path); } catch { /* ignore */ }
        return res.status(409).json({
          error: 'Asset with this ID already exists',
          existingAssetId: baseSlug,
          existingMeta,
        });
      } catch {
        // Doesn't exist — proceed
      }
    }

    const assetDir = path.join(parentDir, assetId);
    await ensureDir(assetDir);

    // Atomic write: model to .tmp then rename
    const tmpModel = path.join(assetDir, 'model.glb.tmp');
    const finalModel = path.join(assetDir, 'model.glb');
    await fs.rename(modelFile.path, tmpModel);
    await fs.rename(tmpModel, finalModel);

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

    await regenerateCatalogIndex();

    res.status(201).json({ ok: true, assetId, path: `${topLevel}/${subFolder}/${assetId}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Catalog reindex ──

router.post('/catalog/reindex', requireAdmin, async (_req, res) => {
  try {
    await regenerateCatalogIndex();
    const index = await readJSON(path.join(CATALOG_DIR, 'index.json'));
    res.json({ ok: true, count: Array.isArray(index) ? index.length : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Catalog management endpoints (hosted mode) ──

// Update metadata for a curated asset
router.put('/catalog/:assetId/meta', requireAdmin, async (req, res) => {
  try {
    const assetDir = await findCatalogAssetDir(req.params.assetId);
    if (!assetDir) return res.status(404).json({ error: 'Curated asset not found' });

    const metaPath = path.join(assetDir, 'meta.json');
    let meta;
    try { meta = JSON.parse(await fs.readFile(metaPath, 'utf-8')); } catch { meta = {}; }

    // Merge updates (only allowed fields)
    const allowed = ['name', 'category', 'subcategory', 'placement', 'style', 'tags', 'ha', 'dimensions', 'performance'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) meta[key] = req.body[key];
    }
    meta.id = req.params.assetId; // Ensure ID stays consistent

    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
    await regenerateCatalogIndex();

    res.json({ ok: true, meta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Replace thumbnail for a curated asset
const thumbUpload = multer({ dest: '/tmp/bjorq-uploads' }).single('thumbnail');
router.put('/catalog/:assetId/thumbnail', requireAdmin, thumbUpload, async (req, res) => {
  try {
    const assetDir = await findCatalogAssetDir(req.params.assetId);
    if (!assetDir) return res.status(404).json({ error: 'Curated asset not found' });
    if (!req.file) return res.status(400).json({ error: 'No thumbnail file provided' });

    // Remove existing thumbnails
    for (const name of ['thumb.webp', 'thumb.png', 'thumb.jpg']) {
      try { await fs.unlink(path.join(assetDir, name)); } catch { /* ignore */ }
    }

    const ext = path.extname(req.file.originalname) || '.png';
    const thumbName = `thumb${ext}`;
    await fs.rename(req.file.path, path.join(assetDir, thumbName));
    await regenerateCatalogIndex();

    res.json({ ok: true, thumbnail: thumbName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a curated asset
router.delete('/catalog/:assetId', requireAdmin, async (req, res) => {
  try {
    const assetDir = await findCatalogAssetDir(req.params.assetId);
    if (!assetDir) return res.status(404).json({ error: 'Curated asset not found' });

    await fs.rm(assetDir, { recursive: true, force: true });
    await regenerateCatalogIndex();

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Serve asset files ──

router.get('/projects/:id/assets/:type/:assetId/files/:filename', async (req, res) => {
  try {
    const filePath = safeProjectPath(
      safeProjectId(req.params.id),
      'assets',
      assertSafeSegment(req.params.type, 'asset type'),
      assertSafeSegment(req.params.assetId, 'asset id'),
      'files',
      assertSafeFilename(req.params.filename)
    );
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch (err) {
    res.status(err?.statusCode || 404).json({ error: 'File not found' });
  }
});

// Delete a prop asset
router.delete('/projects/:id/assets/props/:assetId', requireAdmin, async (req, res) => {
  try {
    const assetDir = safeProjectPath(
      safeProjectId(req.params.id),
      'assets',
      'props',
      assertSafeSegment(req.params.assetId, 'asset id')
    );
    await fs.rm(assetDir, { recursive: true, force: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// ── Internal: regenerate index.json ──

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
      assets.push(...await scanAssets(assetDir, relativeTo));
      continue;
    }

    const relDir = path.relative(relativeTo, assetDir).replace(/\\/g, '/');
    let meta;
    try {
      meta = JSON.parse(await fs.readFile(path.join(assetDir, 'meta.json'), 'utf-8'));
      // Merge defaults for missing required fields
      if (!meta.id) meta.id = entry.name;
      if (!meta.name) meta.name = entry.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      if (!meta.category) {
        const parts = relDir.split('/');
        const subcategory = parts.length >= 2 ? parts[parts.length - 2] : 'imported';
        meta.category = FOLDER_TO_CATEGORY[subcategory] || subcategory;
      }
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
