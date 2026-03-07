import * as THREE from 'three';
import { getMaterialById } from './materials';

/**
 * Creates a 6-element material array for a BoxGeometry wall segment.
 * BoxGeometry face order: +x(right), -x(left), +y(top), -y(bottom), +z(front), -z(back)
 * For a wall, front/back (+z/-z after rotation) are the two visible sides.
 * We map: front = exterior (materialId), back = interior (interiorMaterialId).
 */
export function createWallMaterials(opts: {
  exteriorColor: string;
  interiorColor: string;
  edgeColor: string;
  exteriorRoughness: number;
  interiorRoughness: number;
  emissive?: string;
  emissiveIntensity?: number;
}): THREE.MeshStandardMaterial[] {
  const em = opts.emissive ?? '#000000';
  const ei = opts.emissiveIntensity ?? 0;

  const edge = new THREE.MeshStandardMaterial({ color: opts.edgeColor, roughness: 0.9, emissive: em, emissiveIntensity: ei });
  const exterior = new THREE.MeshStandardMaterial({ color: opts.exteriorColor, roughness: opts.exteriorRoughness, emissive: em, emissiveIntensity: ei });
  const interior = new THREE.MeshStandardMaterial({ color: opts.interiorColor, roughness: opts.interiorRoughness, emissive: em, emissiveIntensity: ei });

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
  const extMatId = wall.materialId || fallbackMatId;
  const intMatId = wall.interiorMaterialId || extMatId;
  const extMat = extMatId ? getMaterialById(extMatId) : null;
  const intMat = intMatId ? getMaterialById(intMatId) : null;

  // Per-side overrides: left = +z face (front/exterior), right = -z face (back/interior)
  const leftMat = wall.leftMaterialId ? getMaterialById(wall.leftMaterialId) : null;
  const rightMat = wall.rightMaterialId ? getMaterialById(wall.rightMaterialId) : null;

  return {
    exteriorColor: leftMat?.color ?? extMat?.color ?? '#e8a845',
    interiorColor: rightMat?.color ?? intMat?.color ?? extMat?.color ?? '#e8a845',
    edgeColor: extMat?.color ?? '#e8a845',
    exteriorRoughness: leftMat?.roughness ?? extMat?.roughness ?? 0.8,
    interiorRoughness: rightMat?.roughness ?? intMat?.roughness ?? extMat?.roughness ?? 0.8,
  };
}
