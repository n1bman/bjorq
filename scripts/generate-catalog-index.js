#!/usr/bin/env node
/**
 * Catalog Index Generator
 * 
 * Scans public/catalog/ for asset folders containing model.glb + meta.json
 * and generates a unified index.json manifest.
 * 
 * Usage:
 *   node scripts/generate-catalog-index.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = path.resolve(__dirname, '../public/catalog');
const INDEX_PATH = path.join(CATALOG_DIR, 'index.json');

const FOLDER_TO_CATEGORY = {
  sofas: 'sofas', chairs: 'chairs', tables: 'tables', beds: 'beds',
  storage: 'storage', lighting: 'lighting', decor: 'decor', plants: 'plants',
  kitchen: 'kitchen', bathroom: 'bathroom', outdoor: 'outdoor',
  lights: 'devices', speakers: 'devices', screens: 'devices', sensors: 'devices',
};

function findAssets(dir, relativeTo) {
  const assets = [];
  if (!fs.existsSync(dir)) return assets;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const assetDir = path.join(dir, entry.name);
    const modelPath = path.join(assetDir, 'model.glb');

    if (fs.existsSync(modelPath)) {
      const relDir = path.relative(relativeTo, assetDir).replace(/\\/g, '/');
      const metaPath = path.join(assetDir, 'meta.json');

      let meta;
      if (fs.existsSync(metaPath)) {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        // Merge defaults for missing required fields
        if (!meta.id) meta.id = entry.name;
        if (!meta.name) meta.name = entry.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        if (!meta.category) {
          const parts = relDir.split('/');
          const subcategory = parts.length >= 2 ? parts[parts.length - 2] : 'imported';
          meta.category = FOLDER_TO_CATEGORY[subcategory] || subcategory;
        }
      } else {
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
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
        console.log(`  [auto] Created meta.json for ${relDir}`);
      }

      let thumbnail = null;
      for (const ext of ['thumb.webp', 'thumb.png', 'thumb.jpg']) {
        if (fs.existsSync(path.join(assetDir, ext))) {
          thumbnail = `${relDir}/${ext}`;
          break;
        }
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
    } else {
      assets.push(...findAssets(assetDir, relativeTo));
    }
  }
  return assets;
}

console.log('Scanning catalog directory:', CATALOG_DIR);
const assets = findAssets(CATALOG_DIR, CATALOG_DIR);
const cleaned = assets.filter(Boolean);

// Check for duplicate IDs
const idMap = new Map();
for (const asset of cleaned) {
  if (idMap.has(asset.id)) {
    console.warn(`  ⚠ Duplicate ID "${asset.id}" — "${idMap.get(asset.id)}" will be overwritten by "${asset.model}"`);
  }
  idMap.set(asset.id, asset.model);
}

fs.writeFileSync(INDEX_PATH, JSON.stringify(cleaned, null, 2));
console.log(`\nGenerated ${INDEX_PATH}`);
console.log(`  ${cleaned.length} assets indexed`);

if (cleaned.length === 0) {
  console.log('\n  No assets found. To add assets:');
  console.log('  1. Create a folder: public/catalog/furniture/sofas/my-sofa/');
  console.log('  2. Add model.glb (required)');
  console.log('  3. Optionally add thumb.webp and meta.json');
  console.log('  4. Re-run this script');
}
