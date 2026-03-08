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
}

/** Validate that a file is GLB/GLTF */
export function validateFormat(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'glb' && ext !== 'gltf') {
    return 'Ogiltigt format — bara GLB/GLTF stöds';
  }
  return null;
}

/** Load and parse a GLB/GLTF file, returning scene + analysis */
export async function processModel(file: File): Promise<PipelineResult> {
  const warnings: string[] = [];

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

  // Auto-detect unit scale: if bounding box is >50m in any axis, likely cm
  let unitScaleFactor = 1.0;
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 100) {
    // Likely millimeters
    unitScaleFactor = 0.001;
    warnings.push(`Modellen verkar vara i millimeter (${maxDim.toFixed(0)}mm) — skalas till meter`);
  } else if (maxDim > 50) {
    // Likely centimeters
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

  // Analyze stats
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
          for (const prop of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'] as const) {
            const tex = (mat as any)[prop] as THREE.Texture | undefined;
            if (tex?.image) {
              const w = tex.image.width || 0;
              const h = tex.image.height || 0;
              maxTexRes = Math.max(maxTexRes, w, h);
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
  if (maxTexRes > 2048) warnings.push(`Stora texturer: ${maxTexRes}px — överväg att minska`);

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

  return { scene, stats, dimensions, thumbnail, warnings, unitScaleFactor };
}

/** Render a 128x128 thumbnail of the model */
function generateThumbnail(scene: THREE.Group, box: THREE.Box3): string {
  const size = 128;
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);

    const thumbScene = new THREE.Scene();
    thumbScene.add(scene.clone());

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    thumbScene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 8, 5);
    thumbScene.add(dir);

    // Camera
    const center = new THREE.Vector3();
    box.getCenter(center);
    const bSize = new THREE.Vector3();
    box.getSize(bSize);
    const maxDim = Math.max(bSize.x, bSize.y, bSize.z);
    const cam = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    cam.position.set(center.x + maxDim * 1.2, center.y + maxDim * 0.8, center.z + maxDim * 1.2);
    cam.lookAt(center);

    renderer.render(thumbScene, cam);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    renderer.dispose();
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
