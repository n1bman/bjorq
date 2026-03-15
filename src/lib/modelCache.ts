import * as THREE from 'three';
import type { PropModelStats } from '../store/types';

/**
 * Phase 1 — Centralized Model & Texture Cache
 * 
 * Golden rule: cached scenes are NEVER modified. All customization happens on clones.
 * Disposal is centralized — individual prop components must NOT dispose shared resources.
 */

// ─── Types ───

interface ModelCacheEntry {
  scene: THREE.Group;        // "golden" original — never modified
  refCount: number;
  stats: PropModelStats;
  lastUsed: number;          // Date.now()
  triangles: number;
}

interface TextureCacheEntry {
  texture: THREE.Texture;
  refCount: number;
  lastUsed: number;
}

export interface CacheStats {
  modelCount: number;
  totalTriangles: number;
  textureCount: number;
}

// ─── Constants ───

const MAX_CACHED_MODELS = 50;
const MAX_TOTAL_TRIANGLES = 2_000_000;

// ─── Singleton state ───

const modelCache = new Map<string, ModelCacheEntry>();
const textureCache = new Map<string, TextureCacheEntry>();
const textureLoader = new THREE.TextureLoader();

// ─── Prop-to-cache-key mapping (for placement engine) ───
const propKeyMap = new Map<string, string>();

// ─── Model analysis ───

function analyzeModel(scene: THREE.Group): PropModelStats {
  let triangles = 0;
  let meshCount = 0;
  const materials = new Set<string>();

  scene.traverse((child: any) => {
    if (child.isMesh) {
      meshCount++;
      const geo = child.geometry;
      if (geo) {
        triangles += geo.index ? geo.index.count / 3 : (geo.attributes.position?.count ?? 0) / 3;
      }
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m: any) => materials.add(m.uuid));
    }
  });

  let rating = 'OK';
  if (triangles > 500_000 || materials.size > 50) rating = 'För tung';
  else if (triangles > 100_000 || materials.size > 20) rating = 'Tung';

  return { triangles: Math.round(triangles), meshCount, materialCount: materials.size, rating };
}

// ─── Model Cache API ───

/**
 * Acquire a model clone from cache. If not cached, calls loader() to parse/load the model,
 * stores the golden original, and returns a clone.
 * 
 * @param cacheKey - Stable key: `catalog:${catalogId}` or `upload:${propId}`
 * @param loader - Async function that returns the parsed THREE.Group
 * @param propId - The prop instance ID (for placement engine mapping)
 * @returns Clone of the golden scene + model stats
 */
export async function acquireModel(
  cacheKey: string,
  loader: () => Promise<THREE.Group>,
  propId?: string,
): Promise<{ clone: THREE.Group; stats: PropModelStats }> {
  // Register prop-to-key mapping
  if (propId) {
    propKeyMap.set(propId, cacheKey);
  }

  const existing = modelCache.get(cacheKey);
  if (existing) {
    existing.refCount++;
    existing.lastUsed = Date.now();
    return { clone: existing.scene.clone(), stats: existing.stats };
  }

  // Load fresh
  const scene = await loader();
  const stats = analyzeModel(scene);

  // Check if we need to evict before adding
  evictIfNeeded(stats.triangles);

  const entry: ModelCacheEntry = {
    scene,
    refCount: 1,
    stats,
    lastUsed: Date.now(),
    triangles: stats.triangles,
  };
  modelCache.set(cacheKey, entry);

  return { clone: scene.clone(), stats };
}

/**
 * Release a reference to a cached model. Disposes the golden scene
 * only when refCount reaches 0.
 */
export function releaseModel(cacheKey: string, propId?: string): void {
  if (propId) {
    propKeyMap.delete(propId);
  }

  const entry = modelCache.get(cacheKey);
  if (!entry) return;

  entry.refCount--;
  if (entry.refCount <= 0) {
    disposeGoldenScene(entry.scene);
    modelCache.delete(cacheKey);
  }
}

// ─── Texture Cache API ───

/**
 * Acquire a texture from cache. Shares the same THREE.Texture instance
 * across all users of the same URL.
 */
export function acquireTexture(url: string): THREE.Texture {
  const existing = textureCache.get(url);
  if (existing) {
    existing.refCount++;
    existing.lastUsed = Date.now();
    return existing.texture;
  }

  const tex = textureLoader.load(url);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  textureCache.set(url, {
    texture: tex,
    refCount: 1,
    lastUsed: Date.now(),
  });

  return tex;
}

/**
 * Release a texture reference. Disposes only when no more users.
 */
export function releaseTexture(url: string): void {
  const entry = textureCache.get(url);
  if (!entry) return;

  entry.refCount--;
  if (entry.refCount <= 0) {
    entry.texture.dispose();
    textureCache.delete(url);
  }
}

// ─── Placement Engine Support ───

/**
 * Get the golden (unmodified) scene for a given cache key.
 * Used by placementEngine for bounding box calculations.
 */
export function getGoldenScene(cacheKey: string): THREE.Group | undefined {
  return modelCache.get(cacheKey)?.scene;
}

/**
 * Get the golden scene for a given prop ID (resolves propId → cacheKey).
 */
export function getGoldenSceneForProp(propId: string): THREE.Group | undefined {
  const key = propKeyMap.get(propId);
  if (!key) return undefined;
  return getGoldenScene(key);
}

/**
 * Get the cache key for a prop ID.
 */
export function getCacheKeyForProp(propId: string): string | undefined {
  return propKeyMap.get(propId);
}

// ─── Stats & Diagnostics ───

export function getStats(): CacheStats {
  let totalTriangles = 0;
  for (const entry of modelCache.values()) {
    totalTriangles += entry.triangles;
  }
  return {
    modelCount: modelCache.size,
    totalTriangles,
    textureCount: textureCache.size,
  };
}

// ─── Memory Safety ───

function getTotalTriangles(): number {
  let total = 0;
  for (const entry of modelCache.values()) {
    total += entry.triangles;
  }
  return total;
}

function evictIfNeeded(incomingTriangles: number): void {
  // Evict LRU entries if we'd exceed limits
  while (
    (modelCache.size >= MAX_CACHED_MODELS || getTotalTriangles() + incomingTriangles > MAX_TOTAL_TRIANGLES) &&
    modelCache.size > 0
  ) {
    evictLRU();
  }
}

function evictLRU(): void {
  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (const [key, entry] of modelCache.entries()) {
    // Only evict entries with refCount 0 first
    if (entry.refCount <= 0 && entry.lastUsed < oldestTime) {
      oldestTime = entry.lastUsed;
      oldestKey = key;
    }
  }

  // If no zero-ref entries, evict the oldest regardless
  if (!oldestKey) {
    for (const [key, entry] of modelCache.entries()) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }
  }

  if (oldestKey) {
    const entry = modelCache.get(oldestKey)!;
    console.info(`[modelCache] Evicting LRU model "${oldestKey}" (${entry.triangles.toLocaleString()} △, refCount: ${entry.refCount})`);
    disposeGoldenScene(entry.scene);
    modelCache.delete(oldestKey);
    // Clean prop mappings
    for (const [propId, key] of propKeyMap.entries()) {
      if (key === oldestKey) propKeyMap.delete(propId);
    }
  }
}

function disposeGoldenScene(scene: THREE.Group): void {
  scene.traverse((child: any) => {
    if (child.isMesh) {
      child.geometry?.dispose();
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat: any) => {
          Object.values(mat).forEach((v: any) => {
            if (v instanceof THREE.Texture) v.dispose();
          });
          mat.dispose();
        });
      }
    }
  });
}

/**
 * Clear entire cache — use on WebGL context loss or app reset.
 */
export function clearAllCaches(): void {
  for (const entry of modelCache.values()) {
    disposeGoldenScene(entry.scene);
  }
  modelCache.clear();

  for (const entry of textureCache.values()) {
    entry.texture.dispose();
  }
  textureCache.clear();

  propKeyMap.clear();

  console.info('[modelCache] All caches cleared');
}

/**
 * Build a cache key for a prop based on its catalog relationship.
 * Catalog items share keys; user uploads get unique keys.
 */
export function buildCacheKey(catalogId: string, propId: string): string {
  return catalogId ? `catalog:${catalogId}` : `upload:${propId}`;
}
