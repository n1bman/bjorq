import * as THREE from 'three';
import type { Material } from '../store/types';

/**
 * B4 — Wall Texture Loader
 * Manages loading, caching, and applying texture maps to wall materials.
 * Provides graceful fallback to flat color if textures fail to load.
 */

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, THREE.Texture>();
const failedPaths = new Set<string>();

function loadTexture(path: string, repeat?: [number, number]): THREE.Texture | null {
  if (failedPaths.has(path)) return null;
  
  const cacheKey = `${path}_${repeat?.[0] ?? 1}_${repeat?.[1] ?? 1}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

  try {
    const tex = textureLoader.load(
      path,
      (loaded) => {
        loaded.wrapS = THREE.RepeatWrapping;
        loaded.wrapT = THREE.RepeatWrapping;
        loaded.colorSpace = THREE.SRGBColorSpace;
        if (repeat) {
          loaded.repeat.set(repeat[0], repeat[1]);
        }
        loaded.needsUpdate = true;
      },
      undefined,
      () => {
        // Mark as failed so we don't retry
        failedPaths.has(path) || failedPaths.add(path);
        console.warn(`[wallTextureLoader] Failed to load texture: ${path}`);
      }
    );
    // Set wrapping immediately (before async load completes)
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (repeat) {
      tex.repeat.set(repeat[0], repeat[1]);
    }
    textureCache.set(cacheKey, tex);
    return tex;
  } catch {
    failedPaths.add(path);
    return null;
  }
}

/**
 * Apply texture maps from a Material preset to a MeshStandardMaterial.
 * Falls back gracefully — if textures are missing, the flat color remains.
 */
export function applyMaterialTextures(
  threeMat: THREE.MeshStandardMaterial,
  preset: Material,
  wallHeight: number = 2.5
): void {
  if (!preset.hasTexture) return;

  const repeat = preset.repeat ?? [1, 1];
  // Scale repeat by wall height so patterns tile correctly
  const effectiveRepeat: [number, number] = [repeat[0], repeat[1] * wallHeight];

  if (preset.mapPath) {
    const map = loadTexture(preset.mapPath, effectiveRepeat);
    if (map) {
      threeMat.map = map;
      threeMat.needsUpdate = true;
    }
  }

  if (preset.normalMapPath) {
    const nmap = loadTexture(preset.normalMapPath, effectiveRepeat);
    if (nmap) {
      nmap.colorSpace = THREE.LinearSRGBColorSpace;
      threeMat.normalMap = nmap;
      threeMat.normalScale = new THREE.Vector2(0.5, 0.5);
      threeMat.needsUpdate = true;
    }
  }

  if (preset.roughnessMapPath) {
    const rmap = loadTexture(preset.roughnessMapPath, effectiveRepeat);
    if (rmap) {
      rmap.colorSpace = THREE.LinearSRGBColorSpace;
      threeMat.roughnessMap = rmap;
      threeMat.needsUpdate = true;
    }
  }

  if (preset.aoMapPath) {
    const aomap = loadTexture(preset.aoMapPath, effectiveRepeat);
    if (aomap) {
      aomap.colorSpace = THREE.LinearSRGBColorSpace;
      threeMat.aoMap = aomap;
      threeMat.aoMapIntensity = 0.5;
      threeMat.needsUpdate = true;
    }
  }
}

/** Clear the texture cache (useful for hot-reload or memory cleanup) */
export function clearTextureCache(): void {
  for (const tex of textureCache.values()) {
    tex.dispose();
  }
  textureCache.clear();
  failedPaths.clear();
}

/** Check if a material preset has real textures available */
export function isTexturedMaterial(preset: Material): boolean {
  return !!(preset.hasTexture && preset.mapPath);
}
