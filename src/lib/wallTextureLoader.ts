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
  forceTexture: boolean = false,
  extraScale: number = 1,
  rotationDeg: number = 0
): void {
  if (!preset.hasTexture) return;

  const effectiveRepeat = calculateRepeat(preset, wallWidth, wallHeight, sizeMode);

  // F6: Apply manual scale multiplier (higher scale = fewer repeats = bigger pattern)
  if (extraScale !== 1 && extraScale > 0) {
    effectiveRepeat[0] /= extraScale;
    effectiveRepeat[1] /= extraScale;
  }

  // F6: Rotation in radians for texture transform
  const rotRad = (rotationDeg % 360) * (Math.PI / 180);

  // Helper: configure a loaded texture with repeat, rotation, and center
  const configureTexture = (tex: THREE.Texture) => {
    tex.repeat.set(effectiveRepeat[0], effectiveRepeat[1]);
    if (rotRad !== 0) {
      tex.rotation = rotRad;
      tex.center.set(0.5, 0.5);
    }
    tex.needsUpdate = true;
  };

  // F6: Cache key includes scale + rotation to avoid cross-room leaking
  const cacheExtra = `_s${extraScale.toFixed(2)}_r${rotationDeg.toFixed(0)}`;

  if (preset.mapPath) {
    const realMap = loadTexture(preset.mapPath, effectiveRepeat);
    if (realMap) {
      const cloned = realMap.clone();
      configureTexture(cloned);
      cloned.colorSpace = THREE.SRGBColorSpace;
      threeMat.map = cloned;
      threeMat.needsUpdate = true;
    }
  }

  if (preset.normalMapPath) {
    const nmap = loadTexture(preset.normalMapPath, effectiveRepeat);
    if (nmap) {
      const cloned = nmap.clone();
      cloned.colorSpace = THREE.LinearSRGBColorSpace;
      configureTexture(cloned);
      threeMat.normalMap = cloned;
      threeMat.normalScale = new THREE.Vector2(0.5, 0.5);
      threeMat.needsUpdate = true;
    }
  }

  if (preset.roughnessMapPath) {
    const rmap = loadTexture(preset.roughnessMapPath, effectiveRepeat);
    if (rmap) {
      const cloned = rmap.clone();
      cloned.colorSpace = THREE.LinearSRGBColorSpace;
      configureTexture(cloned);
      threeMat.roughnessMap = cloned;
      threeMat.needsUpdate = true;
    }
  }

  if (preset.aoMapPath) {
    const aomap = loadTexture(preset.aoMapPath, effectiveRepeat);
    if (aomap) {
      const cloned = aomap.clone();
      cloned.colorSpace = THREE.LinearSRGBColorSpace;
      configureTexture(cloned);
      threeMat.aoMap = cloned;
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
  sizeMode: SurfaceSizeMode = 'auto',
  textureScale: number = 1,
  textureRotation: number = 0
): void {
  applyMaterialTextures(threeMat, preset, floorDepth, floorWidth, sizeMode, 'floor', false, textureScale, textureRotation);
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
