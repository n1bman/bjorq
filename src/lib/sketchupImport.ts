import * as THREE from 'three';
import { unzipSync } from 'fflate';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { analyzeModel } from './modelAnalysis';
import type { ModelStats } from '@/store/types';

// ── Types ──

export type TargetDevice = 'tablet' | 'desktop';

export interface ConversionProgress {
  stage: 'extracting' | 'loading' | 'optimizing' | 'exporting' | 'done' | 'error';
  percent: number;
  message: string;
}

export interface ConversionResult {
  glbBlob: Blob;
  stats: ModelStats;
  originalSize: number;
  optimizedSize: number;
  warnings: string[];
}

export interface FileMap {
  files: Map<string, Blob>;
  totalSize: number;
}

export interface ValidationResult {
  valid: boolean;
  format: 'obj' | 'dae' | null;
  mainFile: string | null;
  mtlFile: string | null;
  textureFiles: string[];
  missingTextures: string[];
  multipleObjFiles: string[];
  errors: string[];
  warnings: string[];
}

// ── Helpers ──

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'tif', 'tiff', 'webp', 'bmp']);
const getExt = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';
const getBasename = (path: string) => path.split('/').pop()?.split('\\').pop() ?? path;

function buildTextureMap(files: Map<string, Blob>): Map<string, Blob> {
  const map = new Map<string, Blob>();
  for (const [path, blob] of files) {
    if (IMAGE_EXTS.has(getExt(path))) {
      const base = getBasename(path).toLowerCase();
      map.set(base, blob);
      // Also store without extension for flexible matching
      const noExt = base.replace(/\.\w+$/, '');
      if (!map.has(noExt)) map.set(noExt, blob);
    }
  }
  return map;
}

// ── ZIP / Folder extraction ──

export async function extractZip(arrayBuffer: ArrayBuffer): Promise<FileMap> {
  const bytes = new Uint8Array(arrayBuffer);

  // Detect archive format via magic bytes
  if (bytes.length >= 4) {
    // RAR: starts with "Rar!" (0x52 0x61 0x72 0x21)
    if (bytes[0] === 0x52 && bytes[1] === 0x61 && bytes[2] === 0x72 && bytes[3] === 0x21) {
      throw new Error(
        'Det här är en RAR-fil, inte en ZIP-fil. RAR-format stöds inte.\n\n' +
        'Så här gör du:\n' +
        '1. Högerklicka på mappen med dina exporterade filer\n' +
        '2. Välj "Skicka till → Komprimerad (zippad) mapp"\n' +
        '3. Ladda upp den nya ZIP-filen här'
      );
    }
    // 7z: starts with "7z" (0x37 0x7A)
    if (bytes[0] === 0x37 && bytes[1] === 0x7A) {
      throw new Error(
        'Det här är en 7z-fil, inte en ZIP-fil. 7z-format stöds inte.\n\n' +
        'Så här gör du:\n' +
        '1. Högerklicka på mappen med dina exporterade filer\n' +
        '2. Välj "Skicka till → Komprimerad (zippad) mapp"\n' +
        '3. Ladda upp den nya ZIP-filen här'
      );
    }
    // ZIP: should start with "PK" (0x50 0x4B)
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
      throw new Error(
        'Filen verkar inte vara en giltig ZIP-fil.\n\n' +
        'Tips: Högerklicka på mappen → "Skicka till → Komprimerad (zippad) mapp"'
      );
    }
  }

  const raw = unzipSync(bytes);
  const files = new Map<string, Blob>();
  let totalSize = 0;

  // Collect all valid paths first
  const validPaths: Array<{ path: string; data: Uint8Array }> = [];
  for (const [path, data] of Object.entries(raw)) {
    if (path.endsWith('/') || path.includes('__MACOSX') || path.startsWith('.')) continue;
    validPaths.push({ path, data });
  }

  // Strip common leading directory prefix (SketchUp ZIPs often have a root folder)
  let commonPrefix = '';
  if (validPaths.length > 0) {
    const parts = validPaths[0].path.split('/');
    if (parts.length > 1) {
      const candidate = parts[0] + '/';
      const allMatch = validPaths.every((p) => p.path.startsWith(candidate));
      if (allMatch) commonPrefix = candidate;
    }
  }

  for (const { path, data } of validPaths) {
    const cleanPath = commonPrefix ? path.slice(commonPrefix.length) : path;
    if (!cleanPath) continue;
    const blob = new Blob([new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength)]);
    files.set(cleanPath, blob);
    totalSize += data.length;
  }

  if (files.size === 0) {
    throw new Error('ZIP-filen verkar vara tom eller innehåller inga giltiga filer.');
  }

  return { files, totalSize };
}

export async function extractFolder(fileList: FileList): Promise<FileMap> {
  const files = new Map<string, Blob>();
  let totalSize = 0;
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const path = (file as any).webkitRelativePath || file.name;
    if (path.includes('__MACOSX')) continue;
    files.set(path, file);
    totalSize += file.size;
  }
  return { files, totalSize };
}

// ── Validation ──

export function validateFileMap(fileMap: FileMap): ValidationResult {
  const result: ValidationResult = {
    valid: false, format: null, mainFile: null, mtlFile: null,
    textureFiles: [], missingTextures: [], multipleObjFiles: [],
    errors: [], warnings: [],
  };

  const objFiles: string[] = [];
  const daeFiles: string[] = [];
  let mtlFile: string | null = null;

  for (const path of fileMap.files.keys()) {
    const ext = getExt(path);
    if (ext === 'obj') objFiles.push(path);
    else if (ext === 'dae') daeFiles.push(path);
    else if (ext === 'mtl') mtlFile = path;
    else if (IMAGE_EXTS.has(ext)) result.textureFiles.push(path);
  }

  // Prefer DAE
  if (daeFiles.length > 0) {
    result.format = 'dae';
    result.mainFile = daeFiles[0];
    if (daeFiles.length > 1) result.warnings.push(`Flera DAE-filer hittades, använder: ${getBasename(daeFiles[0])}`);
  } else if (objFiles.length > 0) {
    result.format = 'obj';
    if (objFiles.length === 1) {
      result.mainFile = objFiles[0];
    } else {
      result.multipleObjFiles = objFiles;
      result.mainFile = objFiles[0]; // default to first
    }
    result.mtlFile = mtlFile;
    if (!mtlFile) {
      result.warnings.push('Ingen MTL-fil hittades — modellen importeras utan material.');
    }
  } else {
    result.errors.push('Ingen OBJ- eller DAE-fil hittades i uppladdningen.');
    return result;
  }

  // Check MTL texture references (basic)
  result.valid = true;
  return result;
}

// ── Texture optimization ──

function downscaleToCanvas(img: HTMLImageElement, maxSize: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function optimizeTextures(scene: THREE.Object3D, maxSize: number, warnings: string[]) {
  const processed = new Set<string>();
  const promises: Promise<void>[] = [];

  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (!mat) continue;
      const texProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'] as const;
      for (const prop of texProps) {
        const tex = (mat as any)[prop] as THREE.Texture | undefined;
        if (!tex?.image || processed.has(tex.uuid)) continue;
        processed.add(tex.uuid);

        const img = tex.image as HTMLImageElement;
        if (img.width <= maxSize && img.height <= maxSize) continue;

        // Downscale
        try {
          const canvas = downscaleToCanvas(img, maxSize);
          tex.image = canvas;
          tex.needsUpdate = true;
        } catch {
          warnings.push(`Kunde inte optimera textur (${img.width}x${img.height})`);
        }
      }
    }
  });

  await Promise.all(promises);
}

function deduplicateMaterials(scene: THREE.Object3D) {
  const materialMap = new Map<string, THREE.Material>();
  
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return;
    const mat = child.material as THREE.Material;
    // Simple key based on type + color
    const meshMat = mat as THREE.MeshStandardMaterial;
    const key = `${mat.type}_${meshMat.color?.getHexString() ?? 'none'}_${meshMat.roughness ?? 0}_${meshMat.metalness ?? 0}`;
    
    if (materialMap.has(key)) {
      child.material = materialMap.get(key)!;
    } else {
      materialMap.set(key, mat);
    }
  });
}

// ── Material conversion ──

function loadTextureAsync(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, reject);
  });
}

function convertMaterialsToStandard(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    const converted = mats.map((mat) => {
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
        return mat;
      }
      const oldMat = mat as any;
      const newMat = new THREE.MeshStandardMaterial({
        color: oldMat.color ?? new THREE.Color(0xcccccc),
        map: oldMat.map ?? null,
        normalMap: oldMat.normalMap ?? null,
        transparent: oldMat.transparent ?? false,
        opacity: oldMat.opacity ?? 1,
        side: oldMat.side ?? THREE.FrontSide,
        roughness: 0.6,
        metalness: 0.0,
      });
      if (oldMat.alphaMap) newMat.alphaMap = oldMat.alphaMap;
      return newMat;
    });
    child.material = converted.length === 1 ? converted[0] : converted;
  });
}

function validateScene(scene: THREE.Object3D) {
  let meshCount = 0;
  let triCount = 0;
  const matTypes = new Set<string>();

  scene.traverse((child) => {
    if (child instanceof THREE.Mesh || (child as any).isMesh || (child as any).isSkinnedMesh || (child as any).isInstancedMesh) {
      meshCount++;
      const geo = (child as THREE.Mesh).geometry;
      if (geo) {
        if (geo.index) triCount += geo.index.count / 3;
        else if (geo.attributes?.position) triCount += geo.attributes.position.count / 3;
      }
      const mats = Array.isArray((child as THREE.Mesh).material) ? (child as THREE.Mesh).material : [(child as THREE.Mesh).material];
      (mats as THREE.Material[]).forEach((m) => m && matTypes.add(m.type));
    }
  });

  console.log(`[SketchUp Import] Scene children: ${scene.children.length}`);
  console.log(`[SketchUp Import] Meshes: ${meshCount}, Triangles: ${Math.round(triCount)}, Material types: ${[...matTypes].join(', ')}`);

  // Log bounding box
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  console.log(`[SketchUp Import] Bounding box size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
  console.log(`[SketchUp Import] Bounding box center: ${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}`);

  if (meshCount === 0) {
    throw new Error('Ingen 3D-geometri hittades i modellen. Kontrollera att filen exporterades korrekt från SketchUp.');
  }

  return { meshCount, triCount, size, center };
}

function normalizeScene(scene: THREE.Object3D): { appliedScale: number; boundingBox: THREE.Vector3 } {
  const box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  // Center the scene at origin
  scene.position.sub(center);
  scene.updateMatrixWorld(true);

  // Auto-scale if too large or too small
  const maxDim = Math.max(size.x, size.y, size.z);
  let appliedScale = 1;

  if (maxDim > 30) {
    appliedScale = 20 / maxDim;
    scene.scale.multiplyScalar(appliedScale);
    console.log(`[SketchUp Import] Auto-scaled down by ${appliedScale.toFixed(4)} (was ${maxDim.toFixed(1)}m)`);
  } else if (maxDim < 0.1 && maxDim > 0) {
    appliedScale = 5 / maxDim;
    scene.scale.multiplyScalar(appliedScale);
    console.log(`[SketchUp Import] Auto-scaled up by ${appliedScale.toFixed(4)} (was ${maxDim.toFixed(4)}m)`);
  }

  scene.updateMatrixWorld(true);

  return { appliedScale, boundingBox: size };
}

// ── Loaders ──

async function loadOBJ(
  files: Map<string, Blob>,
  objPath: string,
  mtlPath: string | null,
  textureMap: Map<string, Blob>,
  warnings: string[],
): Promise<THREE.Group> {
  const objBlob = files.get(objPath)!;
  const objText = await objBlob.text();

  let materials: MTLLoader.MaterialCreator | null = null;

  if (mtlPath) {
    const mtlBlob = files.get(mtlPath)!;
    const mtlText = await mtlBlob.text();
    
    const mtlLoader = new MTLLoader();
    mtlLoader.setResourcePath('');
    
    materials = mtlLoader.parse(mtlText, '');
    
    // Resolve textures from our file map with async loading
    const texPromises: Promise<void>[] = [];
    for (const [name, matInfo] of Object.entries(materials.materialsInfo)) {
      for (const key of ['map_kd', 'map_ks', 'map_bump', 'bump', 'norm', 'map_d']) {
        const texRef = (matInfo as any)[key];
        if (!texRef) continue;
        
        const texBasename = getBasename(texRef).toLowerCase();
        const blob = textureMap.get(texBasename);
        if (blob) {
          const url = URL.createObjectURL(blob);
          const matName = name;
          const texKey = key;
          texPromises.push(
            loadTextureAsync(url).then((tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              const matObj = materials!.materials[matName];
              if (matObj) {
                if (texKey === 'map_kd') (matObj as any).map = tex;
                else if (texKey === 'map_bump' || texKey === 'bump' || texKey === 'norm') (matObj as any).normalMap = tex;
              }
            }).catch(() => {
              warnings.push(`Kunde inte ladda textur: ${texRef}`);
            })
          );
        } else {
          warnings.push(`Textur saknas: ${texRef}`);
        }
      }
    }
    
    await Promise.all(texPromises);
    materials.preload();
  }

  const objLoader = new OBJLoader();
  if (materials) objLoader.setMaterials(materials);
  
  const group = objLoader.parse(objText);
  return group;
}

async function loadDAE(
  files: Map<string, Blob>,
  daePath: string,
  textureMap: Map<string, Blob>,
  warnings: string[],
): Promise<THREE.Group> {
  const daeBlob = files.get(daePath)!;
  const daeText = await daeBlob.text();

  const loader = new ColladaLoader();
  
  // Create a custom loading manager to resolve textures
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    const basename = getBasename(url).toLowerCase();
    const blob = textureMap.get(basename);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    // Try without extension
    const noExt = basename.replace(/\.\w+$/, '');
    const blob2 = textureMap.get(noExt);
    if (blob2) {
      return URL.createObjectURL(blob2);
    }
    warnings.push(`Textur saknas: ${getBasename(url)}`);
    return url;
  });
  
  (loader as any).manager = manager;
  
  const collada = loader.parse(daeText, '');
  const group = new THREE.Group();
  group.add(collada.scene);
  return group;
}

// ── Export ──

async function exportToGLB(scene: THREE.Object3D): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(scene, { binary: true });
  return result as ArrayBuffer;
}

// ── Main pipeline ──

export async function convertSketchUp(
  fileMap: FileMap,
  validation: ValidationResult,
  target: TargetDevice,
  onProgress: (p: ConversionProgress) => void,
  selectedObjFile?: string,
): Promise<ConversionResult> {
  const warnings: string[] = [...validation.warnings];
  const maxTextureSize = target === 'tablet' ? 1024 : 2048;

  // Stage 1: Build texture map
  onProgress({ stage: 'extracting', percent: 10, message: 'Förbereder filer...' });
  const textureMap = buildTextureMap(fileMap.files);

  // Stage 2: Load scene
  onProgress({ stage: 'loading', percent: 30, message: 'Laddar 3D-modell...' });
  
  let scene: THREE.Group;
  const mainFile = selectedObjFile || validation.mainFile!;

  if (validation.format === 'dae') {
    scene = await loadDAE(fileMap.files, mainFile, textureMap, warnings);
  } else {
    scene = await loadOBJ(fileMap.files, mainFile, validation.mtlFile, textureMap, warnings);
  }

  // Validate scene has geometry
  validateScene(scene);

  // Normalize: center at origin and auto-scale
  onProgress({ stage: 'optimizing', percent: 45, message: 'Centrerar och skalar modell...' });
  const normInfo = normalizeScene(scene);
  console.log(`[SketchUp Import] Normalization: scale=${normInfo.appliedScale.toFixed(4)}, bbox=${normInfo.boundingBox.x.toFixed(2)}x${normInfo.boundingBox.y.toFixed(2)}x${normInfo.boundingBox.z.toFixed(2)}`);

  // Stage 3: Convert materials & optimize
  onProgress({ stage: 'optimizing', percent: 50, message: 'Konverterar material...' });
  convertMaterialsToStandard(scene);

  onProgress({ stage: 'optimizing', percent: 60, message: 'Optimerar texturer...' });
  await optimizeTextures(scene, maxTextureSize, warnings);
  deduplicateMaterials(scene);

  // Stage 4: Export
  onProgress({ stage: 'exporting', percent: 85, message: 'Exporterar GLB...' });
  
  // Export the scene root directly
  console.log(`[SketchUp Import] Exporting scene with ${scene.children.length} children`);
  const glbBuffer = await exportToGLB(scene);
  
  // Validate GLB size
  if (glbBuffer.byteLength < 1024) {
    throw new Error(`GLB-filen är för liten (${glbBuffer.byteLength} bytes). Exporten misslyckades — ingen geometri exporterades. Kontrollera att modellen har giltiga meshes.`);
  }
  
  console.log(`[SketchUp Import] GLB exported: ${(glbBuffer.byteLength / 1024).toFixed(1)} KB`);
  
  const glbBlob = new Blob([glbBuffer], { type: 'model/gltf-binary' });

  // Analyze
  const stats = analyzeModel(scene);

  onProgress({ stage: 'done', percent: 100, message: 'Klar!' });

  return {
    glbBlob,
    stats,
    originalSize: fileMap.totalSize,
    optimizedSize: glbBlob.size,
    warnings,
  };
}
