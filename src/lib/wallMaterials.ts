import * as THREE from 'three';
import { getMaterialById } from './materials';
import { applyMaterialTextures } from './wallTextureLoader';

/**
 * Creates a 6-element material array for a BoxGeometry wall segment.
 * BoxGeometry face order: +x(right), -x(left), +y(top), -y(bottom), +z(front), -z(back)
 * For a wall, front/back (+z/-z after rotation) are the two visible sides.
 * We map: front = exterior (materialId), back = interior (interiorMaterialId).
 *
 * B4: Now applies texture maps from material presets when available.
 */
export function createWallMaterials(opts: {
  exteriorColor: string;
  interiorColor: string;
  edgeColor: string;
  exteriorRoughness: number;
  interiorRoughness: number;
  exteriorMetalness?: number;
  interiorMetalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  exteriorMatId?: string;
  interiorMatId?: string;
  wallHeight?: number;
}): THREE.MeshStandardMaterial[] {
  const em = opts.emissive ?? '#000000';
  const ei = opts.emissiveIntensity ?? 0;
  const wh = opts.wallHeight ?? 2.5;

  const offsetProps = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
  const edge = new THREE.MeshStandardMaterial({ color: opts.edgeColor, roughness: 0.9, emissive: em, emissiveIntensity: ei, ...offsetProps });
  const exterior = new THREE.MeshStandardMaterial({
    color: opts.exteriorColor,
    roughness: opts.exteriorRoughness,
    metalness: opts.exteriorMetalness ?? 0,
    emissive: em, emissiveIntensity: ei, ...offsetProps,
  });
  const interior = new THREE.MeshStandardMaterial({
    color: opts.interiorColor,
    roughness: opts.interiorRoughness,
    metalness: opts.interiorMetalness ?? 0,
    emissive: em, emissiveIntensity: ei, ...offsetProps,
  });

  // B4: Apply texture maps if material presets have them
  if (opts.exteriorMatId) {
    const preset = getMaterialById(opts.exteriorMatId);
    if (preset) applyMaterialTextures(exterior, preset, wh);
  }
  if (opts.interiorMatId) {
    const preset = getMaterialById(opts.interiorMatId);
    if (preset) applyMaterialTextures(interior, preset, wh);
  }

  // +x, -x, +y, -y, +z (front=exterior), -z (back=interior)
  return [edge, edge, edge, edge, exterior, interior];
}

/** Resolve exterior/interior colors for a wall segment, with per-side overrides */
export function resolveWallColors(wall: {
  materialId?: string;
  interiorMaterialId?: string;
  leftMaterialId?: string;
  rightMaterialId?: string;
}, fallbackMatId?: string) {
  const defaultColor = '#f5f0e8';
  const defaultRoughness = 0.8;

  // Left side (+z face / front / exterior)
  const leftMat = wall.leftMaterialId ? getMaterialById(wall.leftMaterialId) : null;
  // Right side (-z face / back / interior)
  const rightMat = wall.rightMaterialId ? getMaterialById(wall.rightMaterialId) : null;

  // Legacy fallback only when no per-side material is set
  const extMatId = wall.materialId || fallbackMatId;
  const intMatId = wall.interiorMaterialId || extMatId;
  const extMat = extMatId ? getMaterialById(extMatId) : null;
  const intMat = intMatId ? getMaterialById(intMatId) : null;

  const resolvedExterior = leftMat?.color ?? extMat?.color ?? defaultColor;
  const resolvedInterior = rightMat?.color ?? intMat?.color ?? defaultColor;

  // When no per-side material is set AND no legacy material is set,
  // use the same color on both sides to avoid misleading inside/outside coloring
  // before room detection has run.
  const hasAnyMaterial = wall.leftMaterialId || wall.rightMaterialId || wall.materialId || wall.interiorMaterialId || fallbackMatId;

  return {
    exteriorColor: resolvedExterior,
    interiorColor: hasAnyMaterial ? resolvedInterior : resolvedExterior,
    edgeColor: extMat?.color ?? defaultColor,
    exteriorRoughness: leftMat?.roughness ?? extMat?.roughness ?? defaultRoughness,
    interiorRoughness: hasAnyMaterial ? (rightMat?.roughness ?? intMat?.roughness ?? defaultRoughness) : (leftMat?.roughness ?? extMat?.roughness ?? defaultRoughness),
    exteriorMetalness: leftMat?.metalness ?? extMat?.metalness ?? 0,
    interiorMetalness: hasAnyMaterial ? (rightMat?.metalness ?? intMat?.metalness ?? 0) : (leftMat?.metalness ?? extMat?.metalness ?? 0),
  };
}
