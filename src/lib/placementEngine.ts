import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import type { PropItem, PropCatalogItem, WallSegment } from '../store/types';

/**
 * Categories whose props can act as support surfaces for "table" placement items.
 */
const SUPPORT_CATEGORIES = new Set([
  'tables', 'storage', 'kitchen', 'bathroom',
]);

function isSupportSurface(cat: PropCatalogItem): boolean {
  if (!cat.category) return false;
  return SUPPORT_CATEGORIES.has(cat.category);
}

export function getFloorElevation(floorId: string): number {
  const floor = useAppStore.getState().layout.floors.find(f => f.id === floorId);
  return floor?.elevation ?? 0;
}

export interface PlacementResult {
  position: [number, number, number];
  snappedTo: 'floor' | 'surface' | 'free';
}

/**
 * C4: Check if a position intersects any wall on the active floor.
 * Returns the wall and push-out vector if collision detected.
 */
export function checkWallCollision(
  x: number, z: number,
  walls: WallSegment[],
  margin: number = 0.15,
): { collides: boolean; pushX: number; pushZ: number } {
  for (const wall of walls) {
    const wx = wall.to[0] - wall.from[0];
    const wz = wall.to[1] - wall.from[1];
    const len = Math.sqrt(wx * wx + wz * wz);
    if (len < 0.01) continue;

    const dx = wx / len;
    const dz = wz / len;

    // Project point onto wall line
    const px = x - wall.from[0];
    const pz = z - wall.from[1];
    const proj = px * dx + pz * dz;

    // Check if point is along the wall segment
    if (proj < -margin || proj > len + margin) continue;

    // Perpendicular distance from wall center line
    const perpDist = px * (-dz) + pz * dx; // cross product gives signed distance
    const halfThickness = (wall.thickness ?? 0.15) / 2 + margin;

    if (Math.abs(perpDist) < halfThickness) {
      // Push out along the normal
      const sign = perpDist >= 0 ? 1 : -1;
      const pushAmount = halfThickness - Math.abs(perpDist);
      return {
        collides: true,
        pushX: -dz * sign * pushAmount,
        pushZ: dx * sign * pushAmount,
      };
    }
  }
  return { collides: false, pushX: 0, pushZ: 0 };
}

/**
 * Find the best landing Y position for a prop being dragged.
 * C4: Also applies wall collision barriers for non-free-placement props.
 */
export function findLandingPosition(
  propId: string,
  dragXZ: [number, number],
  currentY: number,
  floorId: string,
  sceneRefs: Map<string, THREE.Group>,
): PlacementResult {
  const state = useAppStore.getState();
  const floorElevation = getFloorElevation(floorId);

  const propItem = state.props.items.find(p => p.id === propId);
  if (!propItem) {
    return { position: [dragXZ[0], Math.max(floorElevation, currentY), dragXZ[1]], snappedTo: 'free' };
  }

  const catItem = state.props.catalog.find(c => c.id === propItem.catalogId);
  const placement = catItem?.placement;

  // C4: Wall collision check for non-wall-mounted, non-free-placement props
  let finalX = dragXZ[0];
  let finalZ = dragXZ[1];
  if (!propItem.freePlacement && !propItem.wallMountInfo && placement !== 'wall' && placement !== 'ceiling') {
    const floor = state.layout.floors.find(f => f.id === floorId);
    const walls = floor?.walls ?? [];
    if (walls.length > 0) {
      const collision = checkWallCollision(finalX, finalZ, walls);
      if (collision.collides) {
        finalX += collision.pushX;
        finalZ += collision.pushZ;
      }
    }
  }

  if (placement === 'floor') {
    return { position: [finalX, floorElevation, finalZ], snappedTo: 'floor' };
  }

  if (placement === 'table') {
    const surfaceY = findSupportSurfaceY(propId, [finalX, finalZ], floorId, floorElevation, sceneRefs, state);
    if (surfaceY !== null) {
      return { position: [finalX, surfaceY, finalZ], snappedTo: 'surface' };
    }
    return { position: [finalX, floorElevation, finalZ], snappedTo: 'floor' };
  }

  if (placement === 'wall' || placement === 'ceiling') {
    return { position: [finalX, Math.max(floorElevation, currentY), finalZ], snappedTo: 'free' };
  }

  if (placement === 'free') {
    return { position: [finalX, Math.max(floorElevation, currentY), finalZ], snappedTo: 'free' };
  }

  // No placement metadata — free placement, but clamp to floor minimum
  return { position: [finalX, Math.max(floorElevation, currentY), finalZ], snappedTo: 'free' };
}

/**
 * Scan other props on the same floor that qualify as support surfaces.
 * If the drag position is within the horizontal bounds of a support,
 * return the top Y of that support's bounding box.
 */
function findSupportSurfaceY(
  draggedPropId: string,
  dragXZ: [number, number],
  floorId: string,
  floorElevation: number,
  sceneRefs: Map<string, THREE.Group>,
  state: ReturnType<typeof useAppStore.getState>,
): number | null {
  const floorProps = state.props.items.filter(
    p => p.floorId === floorId && p.id !== draggedPropId,
  );

  let bestY: number | null = null;

  for (const otherProp of floorProps) {
    // Check if this prop is a valid support surface
    const otherCat = state.props.catalog.find(c => c.id === otherProp.catalogId);
    if (!otherCat || !isSupportSurface(otherCat)) continue;

    // Get loaded scene ref for bounding box
    const sceneRef = sceneRefs.get(otherProp.id);
    if (!sceneRef) continue;

    // Compute world-space bounding box
    const bbox = new THREE.Box3().setFromObject(sceneRef);

    // Apply the prop's position offset (scenes are at origin, positioned via primitive)
    const pos = otherProp.position;
    bbox.min.add(new THREE.Vector3(pos[0], pos[1], pos[2]));
    bbox.max.add(new THREE.Vector3(pos[0], pos[1], pos[2]));

    // Check if drag XZ is within the horizontal footprint (with a small margin)
    const margin = 0.05;
    if (
      dragXZ[0] >= bbox.min.x - margin &&
      dragXZ[0] <= bbox.max.x + margin &&
      dragXZ[1] >= bbox.min.z - margin &&
      dragXZ[1] <= bbox.max.z + margin
    ) {
      const topY = bbox.max.y;
      // Pick the highest valid surface
      if (bestY === null || topY > bestY) {
        bestY = topY;
      }
    }
  }

  return bestY;
}
