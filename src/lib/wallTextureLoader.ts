import * as THREE from 'three';
import type { Material, SurfaceSizeMode } from '../store/types';
import { calculateRepeat } from './materials';

/**
 * B4/B5 — Wall & Floor Texture Loader
 * Manages loading, caching, and applying texture maps to surface materials.
 * Uses real-world sizing (B5) for sensible default scaling.
 * Provides graceful fallback to flat color if textures fail to load.
 */

const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');
const textureCache = new Map<string, THREE.Texture>();
const failedPaths = new Set<string>();

function loadTexture(path: string, repeat?: [number, number]): THREE.Texture | null {
  if (failedPaths.has(path)) return null;
  
  const cacheKey = `${path}_${repeat?.[0]?.toFixed(2) ?? '1'}_${repeat?.[1]?.toFixed(2) ?? '1'}`;
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
        failedPaths.has(path) || failedPaths.add(path);
        console.warn(`[wallTextureLoader] Failed to load texture: ${path}`);
      }
    );
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
 * B5: Uses real-world sizing via calculateRepeat for sensible scale.
 * C1: When context is 'wall', textures are skipped by default (stylized color-only).
 *     Walls only get textures if forceTexture is true (advanced opt-in).
 * Falls back gracefully — if textures are missing, the flat color remains.
 */
export function applyMaterialTextures(
  threeMat: THREE.MeshStandardMaterial,
  preset: Material,
  wallHeight: number = 2.5,
  wallWidth: number = 3.0,
  sizeMode: SurfaceSizeMode = 'auto',
  context: 'wall' | 'floor' = 'wall',
  forceTexture: boolean = false
): void {
  if (!preset.hasTexture) return;

  // C1: Walls render with color/roughness/metalness only — no image textures by default.
  // Floors continue to use textures as their standard rendering path.
  if (context === 'wall' && !forceTexture) return;

  const effectiveRepeat = calculateRepeat(preset, wallWidth, wallHeight, sizeMode);

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

/**
 * B5: Apply textures to floor surfaces using the same system.
 * C1: Floors always use context 'floor' so textures are applied by default.
 */
export function applyFloorTextures(
  threeMat: THREE.MeshStandardMaterial,
  preset: Material,
  floorWidth: number = 4.0,
  floorDepth: number = 4.0,
  sizeMode: SurfaceSizeMode = 'auto'
): void {
  applyMaterialTextures(threeMat, preset, floorDepth, floorWidth, sizeMode, 'floor');
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
