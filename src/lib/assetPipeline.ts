import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { AssetPerformanceStats, AssetDimensions } from '../store/types';

// ─── Types ───

export interface PipelineResult {
  scene: THREE.Group;
  stats: AssetPerformanceStats;
  dimensions: AssetDimensions;
  thumbnail: string;
  warnings: string[];
  unitScaleFactor: number;
}

export type OptimizationLevel = 'ok' | 'recommended' | 'strongly-recommended';

export interface OptimizationResult {
  scene: THREE.Group;
  blob: Blob;
  stats: AssetPerformanceStats;
  beforeStats: AssetPerformanceStats;
  thumbnail: string;
  noImprovement?: boolean;
  savings: {
    fileSizePct: number;
    materialsPct: number;
    texResPct: number;
  };
}

// ─── Validation ───

export function validateFormat(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'glb' && ext !== 'gltf') {
    return 'Ogiltigt format — bara GLB/GLTF stöds';
  }
  return null;
}

// ─── Shared constants ───

const TEX_PROPS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'] as const;

// ─── Texture helpers ───

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

/** Ensure texture is on a canvas, then re-encode as JPEG for smaller GLB export */
async function reencodeTextureAsJPEG(tex: THREE.Texture, quality = 0.85): Promise<boolean> {
  const img = tex.image;
  if (!img) return false;

  const w = img.width || 0;
  const h = img.height || 0;
  if (w === 0 || h === 0) return false;

  // Render to canvas if not already
  let canvas: HTMLCanvasElement;
  if (img instanceof HTMLCanvasElement) {
    canvas = img;
  } else {
    canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(img as any, 0, 0, w, h);
  }

  // Convert canvas to JPEG data URL
  const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);

  // Load JPEG data URL back as an Image element
  const jpegImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = jpegDataUrl;
  });

  tex.image = jpegImg;
  tex.needsUpdate = true;
  return true;
}

// ─── Analysis helpers ───

function analyzeScene(scene: THREE.Object3D): { triangles: number; materialSet: Set<string>; maxTexRes: number } {
  let triangles = 0;
  const materialSet = new Set<string>();
  let maxTexRes = 0;

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
            if (tex?.image) {
              const tw = tex.image.width || 0;
              const th = tex.image.height || 0;
              maxTexRes = Math.max(maxTexRes, tw, th);
            }
          }
        }
      }
    }
  });

  return { triangles: Math.round(triangles), materialSet, maxTexRes };
}

// ─── processModel ───

export async function processModel(file: File, _options?: { maxTextureRes?: number }): Promise<PipelineResult> {
  const warnings: string[] = [];
  

  const buffer = await file.arrayBuffer();
  const loader = new GLTFLoader();
  const gltf = await new Promise<any>((resolve, reject) => {
    loader.parse(buffer, '', resolve, reject);
  });

  const scene = gltf.scene as THREE.Group;

  // Bounding box
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

  // Analyze only — do NOT mutate textures
  const analysis = analyzeScene(scene);
  const fileSizeKB = Math.round(file.size / 1024);

  if (analysis.triangles > 500000) warnings.push(`Hög polygonantal: ${(analysis.triangles / 1000).toFixed(0)}k trianglar`);
  if (fileSizeKB > 10240) warnings.push(`Stor fil: ${(fileSizeKB / 1024).toFixed(1)} MB`);
  if (analysis.maxTexRes > 2048) warnings.push(`Stora texturer: ${analysis.maxTexRes}px`);

  const stats: AssetPerformanceStats = {
    triangles: analysis.triangles,
    materials: analysis.materialSet.size,
    fileSizeKB,
    maxTextureRes: analysis.maxTexRes,
  };

  const dimensions: AssetDimensions = {
    width: parseFloat(size.x.toFixed(2)),
    depth: parseFloat(size.z.toFixed(2)),
    height: parseFloat(size.y.toFixed(2)),
  };

  const thumbnail = generateThumbnail(scene, box);

  return { scene, stats, dimensions, thumbnail, warnings, unitScaleFactor };
}

// ─── Optimization level ───

export function getOptimizationLevel(stats: AssetPerformanceStats): OptimizationLevel {
  const sizeKB = stats.fileSizeKB;
  const tex = stats.maxTextureRes ?? 0;
  if (stats.triangles > 500000 || sizeKB > 10240 || tex > 4096) return 'strongly-recommended';
  if (stats.triangles > 150000 || sizeKB > 5120 || tex > 2048) return 'recommended';
  return 'ok';
}

// ─── V1 Optimize ───

export async function optimizeModel(
  file: File,
  originalStats: AssetPerformanceStats,
  options?: { maxTextureRes?: number }
): Promise<OptimizationResult> {
  const maxTexRes = options?.maxTextureRes ?? 1024;

  // Re-parse from the original file to get pristine, unmodified textures
  const buffer = await file.arrayBuffer();
  const loader = new GLTFLoader();
  const gltf = await new Promise<any>((resolve, reject) => {
    loader.parse(buffer, '', resolve, reject);
  });
  const cloned = gltf.scene as THREE.Group;

  // 1) Collect all materials and check global usage flags
  let anyAoMap = false;
  let anyVertexColors = false;
  const allMaterials: THREE.Material[] = [];

  cloned.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (!mat) continue;
        allMaterials.push(mat);
        if ((mat as any).aoMap) anyAoMap = true;
        if ((mat as any).vertexColors) anyVertexColors = true;
      }
    }
  });

  // 2) Texture downscaling (all maps to maxTexRes) + JPEG re-encoding
  const processedTextures = new Set<string>();
  const jpegReencodeQueue: THREE.Texture[] = [];

  cloned.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (!mat) continue;
        const isTransparent = (mat as any).transparent === true;
        for (const prop of TEX_PROPS) {
          const tex = (mat as any)[prop] as THREE.Texture | undefined;
          if (tex?.image && !processedTextures.has(tex.uuid)) {
            processedTextures.add(tex.uuid);
            downscaleTexture(tex, maxTexRes);
            // Queue non-normal-map, non-transparent textures for JPEG re-encoding
            if (prop !== 'normalMap' && !isTransparent) {
              jpegReencodeQueue.push(tex);
            }
          }
        }
      }
    }
  });

  // Re-encode queued textures as JPEG for much smaller GLB output
  await Promise.all(jpegReencodeQueue.map(tex => reencodeTextureAsJPEG(tex, 0.85)));

  // 3) Material deduplication — key by visual properties
  const matKeyMap = new Map<string, THREE.Material>();
  const matReplace = new Map<string, THREE.Material>(); // uuid -> shared material

  for (const mat of allMaterials) {
    const m = mat as any;
    const parts: string[] = [];
    if (m.color) parts.push(m.color.getHex().toString(16));
    parts.push(`r${(m.roughness ?? 1).toFixed(2)}`);
    parts.push(`m${(m.metalness ?? 0).toFixed(2)}`);
    parts.push(`map:${m.map?.uuid ?? 'none'}`);
    parts.push(`nrm:${m.normalMap?.uuid ?? 'none'}`);
    parts.push(`tr:${m.transparent ? '1' : '0'}`);
    const key = parts.join('|');

    const existing = matKeyMap.get(key);
    if (existing) {
      matReplace.set(mat.uuid, existing);
    } else {
      matKeyMap.set(key, mat);
    }
  }

  // Apply material deduplication
  cloned.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (Array.isArray(child.material)) {
        child.material = child.material.map((m: THREE.Material) => matReplace.get(m.uuid) || m);
      } else if (child.material) {
        const replacement = matReplace.get(child.material.uuid);
        if (replacement) child.material = replacement;
      }
    }
  });

  // 4) Scene cleanup — remove cameras, lights, empty groups
  const toRemove: THREE.Object3D[] = [];
  cloned.traverse((child) => {
    if (child instanceof THREE.Camera || child instanceof THREE.Light) {
      toRemove.push(child);
    }
  });
  for (const obj of toRemove) {
    obj.parent?.remove(obj);
  }

  // Remove empty groups (bottom-up)
  const removeEmptyGroups = (node: THREE.Object3D) => {
    for (let i = node.children.length - 1; i >= 0; i--) {
      removeEmptyGroups(node.children[i]);
    }
    if (!(node instanceof THREE.Mesh) && node.children.length === 0 && node.parent && node !== cloned) {
      node.parent.remove(node);
    }
  };
  removeEmptyGroups(cloned);

  // 5) Conservative vertex attribute stripping
  cloned.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geo = child.geometry;
      // Only remove uv2 if no material in the entire scene uses aoMap
      if (!anyAoMap && geo.attributes.uv2) {
        geo.deleteAttribute('uv2');
      }
      // Only remove color if no material uses vertexColors
      if (!anyVertexColors && geo.attributes.color) {
        geo.deleteAttribute('color');
      }
    }
  });

  // 6) Export to GLB
  const blob = await exportToGLB(cloned);

  // Re-analyze the optimized scene
  const analysis = analyzeScene(cloned);
  const afterStats: AssetPerformanceStats = {
    triangles: analysis.triangles,
    materials: analysis.materialSet.size,
    fileSizeKB: Math.round(blob.size / 1024),
    maxTextureRes: analysis.maxTexRes,
  };

  // Generate new thumbnail
  const box = new THREE.Box3().setFromObject(cloned);
  const thumbnail = generateThumbnail(cloned, box);

  // Calculate savings
  const pct = (before: number, after: number) => before > 0 ? Math.round(((before - after) / before) * 100) : 0;

  // If optimized blob is not smaller, return original and flag noImprovement
  const noImprovement = blob.size >= file.size;
  const finalBlob = noImprovement ? new Blob([buffer], { type: 'model/gltf-binary' }) : blob;
  const finalStats = noImprovement ? originalStats : afterStats;

  const savings = {
    fileSizePct: pct(originalStats.fileSizeKB, finalStats.fileSizeKB),
    materialsPct: pct(originalStats.materials, finalStats.materials),
    texResPct: pct(originalStats.maxTextureRes ?? 0, finalStats.maxTextureRes ?? 0),
  };

  return { scene: cloned, blob: finalBlob, stats: finalStats, beforeStats: originalStats, thumbnail, noImprovement, savings };
}

// ─── GLB Export ───

export async function exportToGLB(scene: THREE.Object3D): Promise<Blob> {
  const exporter = new GLTFExporter();
  const result = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      scene,
      (buffer) => resolve(buffer as ArrayBuffer),
      (error) => reject(error),
      { binary: true }
    );
  });
  return new Blob([result], { type: 'model/gltf-binary' });
}

// ─── Thumbnail ───

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

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    thumbScene.add(ambient);

    const key = new THREE.DirectionalLight(0xfff5e6, 1.0);
    key.position.set(3, 6, 4);
    thumbScene.add(key);

    const fill = new THREE.DirectionalLight(0xe6f0ff, 0.4);
    fill.position.set(-4, 3, 2);
    thumbScene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.3);
    rim.position.set(0, 4, -5);
    thumbScene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.15 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.001;
    thumbScene.add(ground);

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

// ─── Display helpers ───

export function formatStats(stats: AssetPerformanceStats): string {
  const tris = stats.triangles > 1000
    ? `${(stats.triangles / 1000).toFixed(1)}k`
    : `${stats.triangles}`;
  return `${tris} △ · ${stats.materials} mat · ${stats.fileSizeKB > 1024 ? `${(stats.fileSizeKB / 1024).toFixed(1)} MB` : `${stats.fileSizeKB} KB`}`;
}

export function ratePerformance(stats: AssetPerformanceStats): 'ok' | 'heavy' | 'too-heavy' {
  if (stats.triangles > 500000 || stats.fileSizeKB > 10240) return 'too-heavy';
  if (stats.triangles > 150000 || stats.fileSizeKB > 5120) return 'heavy';
  return 'ok';
}

export function formatSize(kb: number): string {
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}
