import * as THREE from 'three';
import { unzipSync } from 'fflate';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { analyzeModel } from './modelAnalysis';
import type { ModelStats } from '@/store/types';

// ── Types ──

export type TargetDevice = 'tablet' | 'desktop';

export interface ConversionProgress {
  stage: 'extracting' | 'loading' | 'optimizing' | 'exporting' | 'done' | 'error';
  percent: number;
  message: string;
}

export interface DebugInfo {
  rootType: string;
  childrenCount: number;
  meshCount: number;
  triangleCount: number;
  boundingBox: { x: number; y: number; z: number };
  missingResources: string[];
}

export interface ConversionResult {
  glbBlob: Blob;
  stats: ModelStats;
  originalSize: number;
  optimizedSize: number;
  warnings: string[];
  debugInfo: DebugInfo;
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
  fileSizes: Map<string, number>;
}

// ── Helpers ──

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'tif', 'tiff', 'webp', 'bmp']);
const getExt = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';
const getBasename = (path: string) => path.split('/').pop()?.split('\\').pop() ?? path;

/** Normalize a path for blob URL map lookups */
function normalizePath(p: string): string {
  let n = p;
  // Strip blob: URLs — extract the original reference
  if (n.startsWith('blob:')) return n; // already a blob URL, return as-is
  // Decode URL encoding
  try { n = decodeURIComponent(n); } catch { /* ignore */ }
  // Backslash → slash
  n = n.replace(/\\/g, '/');
  // Strip leading ./
  n = n.replace(/^\.\//, '');
  // Strip leading /
  n = n.replace(/^\//, '');
  // Lowercase
  n = n.toLowerCase();
  // Trim whitespace
  n = n.trim();
  return n;
}

/**
 * Build blob URLs for ALL extracted files, mapped under multiple normalized keys.
 * Returns the map and a list of all created blob URLs for cleanup.
 */
function buildBlobUrlMap(files: Map<string, Blob>): { blobUrlMap: Map<string, string>; blobUrls: string[] } {
  const map = new Map<string, string>();
  const urls: string[] = [];

  for (const [path, blob] of files) {
    const url = URL.createObjectURL(blob);
    urls.push(url);

    // Store under multiple keys for flexible matching
    const keys = new Set<string>();

    // Full path normalized
    keys.add(normalizePath(path));

    // Basename only
    const base = getBasename(path);
    keys.add(normalizePath(base));

    // Without extension
    const noExt = base.replace(/\.\w+$/, '').toLowerCase();
    keys.add(noExt);

    // With ./ prefix
    keys.add(normalizePath('./' + path));

    // URL-encoded variant
    try {
      keys.add(normalizePath(encodeURIComponent(base)));
    } catch { /* ignore */ }

    // Spaces replaced with %20
    if (base.includes(' ')) {
      keys.add(normalizePath(base.replace(/ /g, '%20')));
    }

    for (const key of keys) {
      if (key && !map.has(key)) {
        map.set(key, url);
      }
    }
  }

  console.log(`[SketchUp Import] Built blobUrlMap with ${map.size} keys for ${files.size} files`);
  return { blobUrlMap: map, blobUrls: urls };
}

/** Resolve a URL reference against the blobUrlMap */
function resolveFromBlobMap(
  url: string,
  blobUrlMap: Map<string, string>,
  missingResources: string[],
): string {
  // If it's already a blob URL that we created, pass through
  if (url.startsWith('blob:') && [...blobUrlMap.values()].includes(url)) {
    return url;
  }

  const normalized = normalizePath(url);
  const resolved = blobUrlMap.get(normalized);
  if (resolved) return resolved;

  // Try basename only
  const base = normalizePath(getBasename(url));
  const resolvedBase = blobUrlMap.get(base);
  if (resolvedBase) return resolvedBase;

  // Try without extension
  const noExt = base.replace(/\.\w+$/, '');
  const resolvedNoExt = blobUrlMap.get(noExt);
  if (resolvedNoExt) return resolvedNoExt;

  // Not found
  const cleanName = getBasename(url);
  if (!missingResources.includes(cleanName)) {
    missingResources.push(cleanName);
  }
  console.warn(`[SketchUp Import] Unresolved resource: "${url}" (normalized: "${normalized}")`);
  return url;
}

// ── ZIP / Folder extraction ──

export async function extractZip(arrayBuffer: ArrayBuffer): Promise<FileMap> {
  const bytes = new Uint8Array(arrayBuffer);

  // Detect archive format via magic bytes
  if (bytes.length >= 4) {
    if (bytes[0] === 0x52 && bytes[1] === 0x61 && bytes[2] === 0x72 && bytes[3] === 0x21) {
      throw new Error(
        'Det här är en RAR-fil, inte en ZIP-fil. RAR-format stöds inte.\n\n' +
        'Så här gör du:\n' +
        '1. Högerklicka på mappen med dina exporterade filer\n' +
        '2. Välj "Skicka till → Komprimerad (zippad) mapp"\n' +
        '3. Ladda upp den nya ZIP-filen här'
      );
    }
    if (bytes[0] === 0x37 && bytes[1] === 0x7A) {
      throw new Error(
        'Det här är en 7z-fil, inte en ZIP-fil. 7z-format stöds inte.\n\n' +
        'Så här gör du:\n' +
        '1. Högerklicka på mappen med dina exporterade filer\n' +
        '2. Välj "Skicka till → Komprimerad (zippad) mapp"\n' +
        '3. Ladda upp den nya ZIP-filen här'
      );
    }
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

  const validPaths: Array<{ path: string; data: Uint8Array }> = [];
  for (const [path, data] of Object.entries(raw)) {
    if (path.endsWith('/') || path.includes('__MACOSX') || path.startsWith('.')) continue;
    validPaths.push({ path, data });
  }

  // Strip common leading directory prefix
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
    fileSizes: new Map<string, number>(),
  };

  const objFiles: string[] = [];
  const daeFiles: string[] = [];
  let mtlFile: string | null = null;

  for (const [path, blob] of fileMap.files) {
    const ext = getExt(path);
    // Track file sizes for all model files
    result.fileSizes.set(path, blob.size);

    if (ext === 'obj') objFiles.push(path);
    else if (ext === 'dae') daeFiles.push(path);
    else if (ext === 'mtl') mtlFile = path;
    else if (IMAGE_EXTS.has(ext)) result.textureFiles.push(path);
  }

  // Prefer DAE, default to largest file
  if (daeFiles.length > 0) {
    result.format = 'dae';
    // Pick largest DAE
    daeFiles.sort((a, b) => (result.fileSizes.get(b) ?? 0) - (result.fileSizes.get(a) ?? 0));
    result.mainFile = daeFiles[0];
    if (daeFiles.length > 1) result.warnings.push(`Flera DAE-filer hittades, använder störst: ${getBasename(daeFiles[0])}`);
  } else if (objFiles.length > 0) {
    result.format = 'obj';
    // Sort by size descending — default to largest
    objFiles.sort((a, b) => (result.fileSizes.get(b) ?? 0) - (result.fileSizes.get(a) ?? 0));
    if (objFiles.length === 1) {
      result.mainFile = objFiles[0];
    } else {
      result.multipleObjFiles = objFiles;
      result.mainFile = objFiles[0]; // largest by default
    }
    result.mtlFile = mtlFile;
    if (!mtlFile) {
      result.warnings.push('Ingen MTL-fil hittades — modellen importeras utan material.');
    }
  } else {
    result.errors.push('Ingen OBJ- eller DAE-fil hittades i uppladdningen.');
    return result;
  }

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
}

function deduplicateMaterials(scene: THREE.Object3D) {
  const materialMap = new Map<string, THREE.Material>();
  
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return;
    const mat = child.material as THREE.Material;
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

/** Count meshes and triangles, including SkinnedMesh and InstancedMesh */
function collectSceneStats(scene: THREE.Object3D): { meshCount: number; triCount: number } {
  let meshCount = 0;
  let triCount = 0;

  scene.traverse((child) => {
    if (
      child instanceof THREE.Mesh ||
      (child as any).isMesh ||
      (child as any).isSkinnedMesh ||
      (child as any).isInstancedMesh
    ) {
      meshCount++;
      const geo = (child as THREE.Mesh).geometry;
      if (geo) {
        if (geo.index) triCount += geo.index.count / 3;
        else if (geo.attributes?.position) triCount += geo.attributes.position.count / 3;
      }
    }
  });

  return { meshCount, triCount: Math.round(triCount) };
}

function validateScene(scene: THREE.Object3D) {
  const { meshCount, triCount } = collectSceneStats(scene);
  const matTypes = new Set<string>();

  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      (mats as THREE.Material[]).forEach((m) => m && matTypes.add(m.type));
    }
  });

  console.log(`[SketchUp Import] Scene children: ${scene.children.length}`);
  console.log(`[SketchUp Import] Meshes: ${meshCount}, Triangles: ${triCount}, Material types: ${[...matTypes].join(', ')}`);

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

  scene.position.sub(center);
  scene.updateMatrixWorld(true);

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
  blobUrlMap: Map<string, string>,
  missingResources: string[],
  warnings: string[],
  fastMode = false,
): Promise<THREE.Group> {
  const objBlob = files.get(objPath)!;

  // Use ArrayBuffer + TextDecoder to avoid silent truncation on large files
  const objBuffer = await objBlob.arrayBuffer();
  const objText = new TextDecoder().decode(objBuffer);
  console.log(`[SketchUp Import] OBJ file size: ${objBuffer.byteLength}, text length: ${objText.length}`);

  // Create a LoadingManager with URL modifier for resource resolution
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => resolveFromBlobMap(url, blobUrlMap, missingResources));

  let materials: MTLLoader.MaterialCreator | null = null;

  if (mtlPath && !fastMode) {
    const mtlBlob = files.get(mtlPath)!;
    const mtlBuffer = await mtlBlob.arrayBuffer();
    const mtlText = new TextDecoder().decode(mtlBuffer);

    const mtlLoader = new MTLLoader(manager);
    // Set resource path to empty — URLModifier handles resolution
    mtlLoader.setResourcePath('');

    materials = mtlLoader.parse(mtlText, '');
    materials.preload();

    console.log(`[SketchUp Import] MTL parsed, materials: ${Object.keys(materials.materials).join(', ')}`);
  } else if (mtlPath && fastMode) {
    console.log(`[SketchUp Import] Fast mode — skipping MTL loading`);
  }

  const objLoader = new OBJLoader(manager);
  if (materials) objLoader.setMaterials(materials);

  const group = objLoader.parse(objText);

  // Post-parse validation
  const { meshCount, triCount } = collectSceneStats(group);
  console.log(`[SketchUp Import] OBJ parsed: ${group.children.length} children, ${meshCount} meshes, ${triCount} triangles`);

  if (meshCount === 0) {
    console.error(`[SketchUp Import] OBJ text preview: ${objText.substring(0, 500)}`);
    throw new Error(`OBJ loaded but 0 meshes found. File size: ${objBuffer.byteLength}, text length: ${objText.length}. OBJ parsing failed.`);
  }

  const box = new THREE.Box3().setFromObject(group);
  console.log(`[SketchUp Import] OBJ bounding box:`, box);
  if (box.isEmpty()) {
    throw new Error('OBJ model bounding box is empty');
  }

  // Fast mode: assign simple default material to all meshes
  if (fastMode) {
    const defaultMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = defaultMat;
      }
    });
    console.log(`[SketchUp Import] Fast mode — assigned default material to ${meshCount} meshes`);
  }

  return group;
}

async function loadDAE(
  files: Map<string, Blob>,
  daePath: string,
  blobUrlMap: Map<string, string>,
  missingResources: string[],
  warnings: string[],
): Promise<THREE.Group> {
  const daeBlob = files.get(daePath)!;
  const daeBuffer = await daeBlob.arrayBuffer();
  const daeText = new TextDecoder().decode(daeBuffer);
  console.log(`[SketchUp Import] DAE file size: ${daeBuffer.byteLength}, text length: ${daeText.length}`);

  // Create a LoadingManager with URL modifier
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => resolveFromBlobMap(url, blobUrlMap, missingResources));

  const loader = new ColladaLoader(manager);

  // Compute a base path from the DAE file's directory
  const daeDir = daePath.includes('/') ? daePath.substring(0, daePath.lastIndexOf('/') + 1) : '';
  const baseBlobUrl = daeDir ? (blobUrlMap.get(normalizePath(daeDir)) || '') : '';

  console.log(`[SketchUp Import] DAE base path: "${daeDir}", baseBlobUrl: "${baseBlobUrl}"`);

  const collada = loader.parse(daeText, baseBlobUrl || './');

  // Export collada.scene directly — this is the actual loaded scene graph
  const scene = collada.scene;

  console.log(`[SketchUp Import] DAE loaded: ${scene.children.length} children, type=${scene.type}`);

  // Wrap in a group to be consistent with OBJ path
  const group = new THREE.Group();
  // Move all children to our group
  while (scene.children.length > 0) {
    group.add(scene.children[0]);
  }

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
  fastMode = false,
): Promise<ConversionResult> {
  const warnings: string[] = [...validation.warnings];
  const missingResources: string[] = [];
  const maxTextureSize = target === 'tablet' ? 1024 : 2048;

  // Stage 1: Build blob URL map for ALL files
  onProgress({ stage: 'extracting', percent: 10, message: 'Förbereder filer...' });
  const { blobUrlMap, blobUrls } = buildBlobUrlMap(fileMap.files);

  try {
    // Stage 2: Load scene
    onProgress({ stage: 'loading', percent: 30, message: 'Laddar 3D-modell...' });
    
    let scene: THREE.Group;
    const mainFile = selectedObjFile || validation.mainFile!;

    if (validation.format === 'dae') {
      scene = await loadDAE(fileMap.files, mainFile, blobUrlMap, missingResources, warnings);
    } else {
      scene = await loadOBJ(fileMap.files, mainFile, validation.mtlFile, blobUrlMap, missingResources, warnings, fastMode);
    }

    // Validate scene has geometry
    const sceneInfo = validateScene(scene);

    // Normalize: center at origin and auto-scale
    onProgress({ stage: 'optimizing', percent: 45, message: 'Centrerar och skalar modell...' });
    const normInfo = normalizeScene(scene);

    // Stage 3: Convert materials & optimize
    onProgress({ stage: 'optimizing', percent: 50, message: 'Konverterar material...' });
    convertMaterialsToStandard(scene);

    onProgress({ stage: 'optimizing', percent: 60, message: 'Optimerar texturer...' });
    await optimizeTextures(scene, maxTextureSize, warnings);
    deduplicateMaterials(scene);

    // Stage 4: Export — export the same scene we validated
    onProgress({ stage: 'exporting', percent: 85, message: 'Exporterar GLB...' });
    
    console.log(`[SketchUp Import] Exporting scene with ${scene.children.length} children`);
    const glbBuffer = await exportToGLB(scene);
    
    if (glbBuffer.byteLength < 1024) {
      throw new Error(`GLB-filen är för liten (${glbBuffer.byteLength} bytes). Exporten misslyckades — ingen geometri exporterades.`);
    }
    
    console.log(`[SketchUp Import] GLB exported: ${(glbBuffer.byteLength / 1024).toFixed(1)} KB`);
    
    const glbBlob = new Blob([glbBuffer], { type: 'model/gltf-binary' });
    const stats = analyzeModel(scene);

    // Build debug info
    const box = new THREE.Box3().setFromObject(scene);
    const bboxSize = box.getSize(new THREE.Vector3());
    const { meshCount, triCount } = collectSceneStats(scene);

    const debugInfo: DebugInfo = {
      rootType: scene.type,
      childrenCount: scene.children.length,
      meshCount,
      triangleCount: triCount,
      boundingBox: {
        x: Math.round(bboxSize.x * 100) / 100,
        y: Math.round(bboxSize.y * 100) / 100,
        z: Math.round(bboxSize.z * 100) / 100,
      },
      missingResources,
    };

    if (missingResources.length > 0) {
      warnings.push(`${missingResources.length} resurser kunde inte hittas (se debug-panel)`);
    }

    onProgress({ stage: 'done', percent: 100, message: 'Klar!' });

    return {
      glbBlob,
      stats,
      originalSize: fileMap.totalSize,
      optimizedSize: glbBlob.size,
      warnings,
      debugInfo,
    };
  } finally {
    // Cleanup all blob URLs
    for (const url of blobUrls) {
      URL.revokeObjectURL(url);
    }
    console.log(`[SketchUp Import] Cleaned up ${blobUrls.length} blob URLs`);
  }
}

// ── Diagnostic types & functions ──

export interface LoaderTestResult {
  mainFile: string;
  mainFileSize: number;
  rootType: string;
  childrenCount: number;
  meshCount: number;
  triCount: number;
  boundingBox: { x: number; y: number; z: number };
  materialTypes: string[];
  childTree: { name: string; type: string; children: number }[];
  missingResources: string[];
}

/** Walk first 2 levels of children and collect debug info */
function buildChildTree(root: THREE.Object3D): { name: string; type: string; children: number }[] {
  const tree: { name: string; type: string; children: number }[] = [];
  for (const child of root.children) {
    tree.push({ name: child.name || '(unnamed)', type: child.type, children: child.children.length });
    for (const grandchild of child.children) {
      tree.push({ name: `  ${grandchild.name || '(unnamed)'}`, type: grandchild.type, children: grandchild.children.length });
    }
  }
  return tree;
}

/**
 * Load OBJ/DAE without exporting to GLB — just return scene stats for debugging.
 */
export async function testLoadOnly(
  fileMap: FileMap,
  validation: ValidationResult,
  selectedObjFile?: string | null,
  fastMode = false,
): Promise<LoaderTestResult> {
  const missingResources: string[] = [];
  const warnings: string[] = [];
  const { blobUrlMap, blobUrls } = buildBlobUrlMap(fileMap.files);

  try {
    const mainFile = selectedObjFile || validation.mainFile!;
    const mainBlob = fileMap.files.get(mainFile);
    const mainFileSize = mainBlob?.size ?? 0;

    console.log(`[testLoadOnly] Loading: ${mainFile} (${mainFileSize} bytes), fastMode=${fastMode}`);

    let scene: THREE.Group;
    if (validation.format === 'dae') {
      scene = await loadDAE(fileMap.files, mainFile, blobUrlMap, missingResources, warnings);
    } else {
      scene = await loadOBJ(fileMap.files, mainFile, validation.mtlFile, blobUrlMap, missingResources, warnings, fastMode);
    }

    const { meshCount, triCount } = collectSceneStats(scene);

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());

    const matTypes = new Set<string>();
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        (mats as THREE.Material[]).forEach((m) => m && matTypes.add(m.type));
      }
    });

    const childTree = buildChildTree(scene);

    console.log(`[testLoadOnly] Result: meshes=${meshCount}, tris=${triCount}, children=${scene.children.length}`);
    console.log(`[testLoadOnly] Child tree:`, childTree);

    return {
      mainFile,
      mainFileSize,
      rootType: scene.type,
      childrenCount: scene.children.length,
      meshCount,
      triCount,
      boundingBox: {
        x: Math.round(size.x * 100) / 100,
        y: Math.round(size.y * 100) / 100,
        z: Math.round(size.z * 100) / 100,
      },
      materialTypes: [...matTypes],
      childTree,
      missingResources,
    };
  } finally {
    for (const url of blobUrls) URL.revokeObjectURL(url);
  }
}

/**
 * Sanity test: create a box, export to GLB, load it back, count triangles.
 */
export async function testGLBExportSanity(): Promise<{ success: boolean; byteLength: number; triCount: number; error?: string }> {
  try {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'sanity-test-box';

    const scene = new THREE.Scene();
    scene.add(mesh);

    // Export
    const exporter = new GLTFExporter();
    const glbBuffer = await exporter.parseAsync(scene, { binary: true }) as ArrayBuffer;
    console.log(`[testGLBExportSanity] Exported ${glbBuffer.byteLength} bytes`);

    // Load back
    const blob = new Blob([glbBuffer], { type: 'model/gltf-binary' });
    const url = URL.createObjectURL(blob);

    const triCount = await new Promise<number>((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          let tris = 0;
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
              if (child.geometry.index) tris += child.geometry.index.count / 3;
              else if (child.geometry.attributes?.position) tris += child.geometry.attributes.position.count / 3;
            }
          });
          URL.revokeObjectURL(url);
          resolve(Math.round(tris));
        },
        undefined,
        (err) => {
          URL.revokeObjectURL(url);
          reject(err);
        },
      );
    });

    console.log(`[testGLBExportSanity] Loaded back: ${triCount} triangles`);
    return { success: true, byteLength: glbBuffer.byteLength, triCount };
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[testGLBExportSanity] Failed:`, msg);
    return { success: false, byteLength: 0, triCount: 0, error: msg };
  }
}
