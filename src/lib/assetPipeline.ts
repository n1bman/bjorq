import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AssetPerformanceStats, AssetDimensions } from '../store/types';

export interface PipelineResult {
  scene: THREE.Group;
  stats: AssetPerformanceStats;
  dimensions: AssetDimensions;
  thumbnail: string;          // data URL (png)
  warnings: string[];
  unitScaleFactor: number;    // 1.0 if meters, 0.01 if cm detected, etc.
  texturesDownscaled: number; // how many textures were resized
}

/** Validate that a file is GLB/GLTF */
export function validateFormat(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'glb' && ext !== 'gltf') {
    return 'Ogiltigt format — bara GLB/GLTF stöds';
  }
  return null;
}

/** Downscale a texture image to maxRes using an offscreen canvas */
function downscaleTexture(tex: THREE.Texture, maxRes: number): boolean {
  const img = tex.image;
  if (!img || !(img instanceof HTMLImageElement || img instanceof HTMLCanvasElement || img instanceof ImageBitmap)) {
    return false;
  }
  const w = img.width || 0;
  const h = img.height || 0;
  if (w <= maxRes && h <= maxRes) return false;

  const scale = maxRes / Math.max(w, h);
  const nw = Math.round(w * scale);
  const nh = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = nw;
  canvas.height = nh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  ctx.drawImage(img as any, 0, 0, nw, nh);
  tex.image = canvas;
  tex.needsUpdate = true;
  return true;
}

const TEX_PROPS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'] as const;

/** Load and parse a GLB/GLTF file, returning scene + analysis */
export async function processModel(file: File, options?: { maxTextureRes?: number }): Promise<PipelineResult> {
  const warnings: string[] = [];
  const maxTextureRes = options?.maxTextureRes ?? 2048;

  // Load
  const buffer = await file.arrayBuffer();
  const loader = new GLTFLoader();
  const gltf = await new Promise<any>((resolve, reject) => {
    loader.parse(buffer, '', resolve, reject);
  });

  const scene = gltf.scene as THREE.Group;

  // Analyze bounding box
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Auto-detect unit scale
  let unitScaleFactor = 1.0;
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 100) {
    unitScaleFactor = 0.001;
    warnings.push(`Modellen verkar vara i millimeter (${maxDim.toFixed(0)}mm) — skalas till meter`);
  } else if (maxDim > 50) {
    unitScaleFactor = 0.01;
    warnings.push(`Modellen verkar vara i centimeter (${maxDim.toFixed(0)}cm) — skalas till meter`);
  }

  if (unitScaleFactor !== 1.0) {
    scene.scale.multiplyScalar(unitScaleFactor);
    scene.updateMatrixWorld(true);
    box.setFromObject(scene);
    box.getSize(size);
  }

  // Center pivot + floor placement
  const center = new THREE.Vector3();
  box.getCenter(center);
  scene.position.set(-center.x, -box.min.y, -center.z);
  scene.updateMatrixWorld(true);

  // Analyze stats + downscale textures
  let triangles = 0;
  const materialSet = new Set<string>();
  const processedTextures = new Set<string>();
  let maxTexRes = 0;
  let texturesDownscaled = 0;

  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geo = child.geometry;
      if (geo.index) {
        triangles += geo.index.count / 3;
      } else if (geo.attributes.position) {
        triangles += geo.attributes.position.count / 3;
      }
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (mat) {
          materialSet.add(mat.uuid);
          for (const prop of TEX_PROPS) {
            const tex = (mat as any)[prop] as THREE.Texture | undefined;
            if (tex?.image && !processedTextures.has(tex.uuid)) {
              processedTextures.add(tex.uuid);
              const w = tex.image.width || 0;
              const h = tex.image.height || 0;
              maxTexRes = Math.max(maxTexRes, w, h);

              // Downscale if over limit
              if (Math.max(w, h) > maxTextureRes) {
                if (downscaleTexture(tex, maxTextureRes)) {
                  texturesDownscaled++;
                }
              }
            }
          }
        }
      }
    }
  });

  const triCount = Math.round(triangles);
  const fileSizeKB = Math.round(file.size / 1024);

  if (triCount > 500000) warnings.push(`Hög polygonantal: ${(triCount / 1000).toFixed(0)}k trianglar`);
  if (fileSizeKB > 10240) warnings.push(`Stor fil: ${(fileSizeKB / 1024).toFixed(1)} MB`);
  if (texturesDownscaled > 0) {
    warnings.push(`${texturesDownscaled} textur${texturesDownscaled > 1 ? 'er' : ''} nedskalade till ${maxTextureRes}px`);
  } else if (maxTexRes > maxTextureRes) {
    warnings.push(`Stora texturer: ${maxTexRes}px`);
  }

  const stats: AssetPerformanceStats = {
    triangles: triCount,
    materials: materialSet.size,
    fileSizeKB,
  };

  const dimensions: AssetDimensions = {
    width: parseFloat(size.x.toFixed(2)),
    depth: parseFloat(size.z.toFixed(2)),
    height: parseFloat(size.y.toFixed(2)),
  };

  // Generate thumbnail
  const thumbnail = generateThumbnail(scene, box);

  return { scene, stats, dimensions, thumbnail, warnings, unitScaleFactor, texturesDownscaled };
}

/** Render a 192x192 thumbnail with studio-style lighting */
function generateThumbnail(scene: THREE.Group, box: THREE.Box3): string {
  const res = 192;
  try {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(res, res);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const thumbScene = new THREE.Scene();
    const clone = scene.clone();
    thumbScene.add(clone);

    // Studio lighting: 3-point setup
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    thumbScene.add(ambient);

    // Key light (warm, strong, upper-right)
    const key = new THREE.DirectionalLight(0xfff5e6, 1.0);
    key.position.set(3, 6, 4);
    thumbScene.add(key);

    // Fill light (cool, softer, left)
    const fill = new THREE.DirectionalLight(0xe6f0ff, 0.4);
    fill.position.set(-4, 3, 2);
    thumbScene.add(fill);

    // Rim light (behind, subtle)
    const rim = new THREE.DirectionalLight(0xffffff, 0.3);
    rim.position.set(0, 4, -5);
    thumbScene.add(rim);

    // Subtle ground plane for shadow hint
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.15 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.001;
    thumbScene.add(ground);

    // Camera — slightly elevated angle for better silhouette
    const center = new THREE.Vector3();
    box.getCenter(center);
    const bSize = new THREE.Vector3();
    box.getSize(bSize);
    const maxDim = Math.max(bSize.x, bSize.y, bSize.z);
    const dist = maxDim * 1.6;

    const cam = new THREE.PerspectiveCamera(35, 1, 0.01, 200);
    cam.position.set(
      center.x + dist * 0.7,
      center.y + dist * 0.5,
      center.z + dist * 0.7
    );
    cam.lookAt(center);

    renderer.render(thumbScene, cam);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    // Cleanup
    renderer.dispose();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => m?.dispose());
      }
    });

    return dataUrl;
  } catch {
    return '';
  }
}

/** Format stats for display */
export function formatStats(stats: AssetPerformanceStats): string {
  const tris = stats.triangles > 1000
    ? `${(stats.triangles / 1000).toFixed(1)}k`
    : `${stats.triangles}`;
  return `${tris} △ · ${stats.materials} mat · ${stats.fileSizeKB > 1024 ? `${(stats.fileSizeKB / 1024).toFixed(1)} MB` : `${stats.fileSizeKB} KB`}`;
}

/** Performance rating */
export function ratePerformance(stats: AssetPerformanceStats): 'ok' | 'heavy' | 'too-heavy' {
  if (stats.triangles > 500000 || stats.fileSizeKB > 10240) return 'too-heavy';
  if (stats.triangles > 150000 || stats.fileSizeKB > 5120) return 'heavy';
  return 'ok';
}
