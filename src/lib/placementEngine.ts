import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import type { PropItem, PropCatalogItem } from '../store/types';

/**
 * Categories whose props can act as support surfaces for "table" placement items.
 * Only reasonable furniture surfaces — not decor, plants, etc.
 */
const SUPPORT_CATEGORIES = new Set([
  'tables', 'storage', 'kitchen', 'bathroom',
]);

/** Check if a catalog item qualifies as a support surface */
function isSupportSurface(cat: PropCatalogItem): boolean {
  if (!cat.category) return false;
  return SUPPORT_CATEGORIES.has(cat.category);
}

/** Get the floor elevation from the store (not hardcoded 0) */
export function getFloorElevation(floorId: string): number {
  const floor = useAppStore.getState().layout.floors.find(f => f.id === floorId);
  return floor?.elevation ?? 0;
}

export interface PlacementResult {
  position: [number, number, number];
  snappedTo: 'floor' | 'surface' | 'free';
}

/**
 * Find the best landing Y position for a prop being dragged.
 * 
 * Rules:
 * - 'floor' placement → Y = floor elevation
 * - 'table' placement → try to snap on top of support surfaces, fallback to floor elevation
 * - 'wall'/'ceiling' → passthrough (keep current Y)
 * - no metadata → max(floor elevation, currentY)
 * 
 * Uses bounding boxes from loaded scene refs for surface detection.
 * Event-driven — only called during drag, not per-frame.
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

  // Look up the dragged prop and its catalog entry
  const propItem = state.props.items.find(p => p.id === propId);
  if (!propItem) {
    return { position: [dragXZ[0], Math.max(floorElevation, currentY), dragXZ[1]], snappedTo: 'free' };
  }

  const catItem = state.props.catalog.find(c => c.id === propItem.catalogId);
  const placement = catItem?.placement;

  // Floor placement — snap to floor elevation
  if (placement === 'floor') {
    return { position: [dragXZ[0], floorElevation, dragXZ[1]], snappedTo: 'floor' };
  }

  // Table/surface placement — try to land on a support surface
  if (placement === 'table') {
    const surfaceY = findSupportSurfaceY(propId, dragXZ, floorId, floorElevation, sceneRefs, state);
    if (surfaceY !== null) {
      return { position: [dragXZ[0], surfaceY, dragXZ[1]], snappedTo: 'surface' };
    }
    // Fallback: floor elevation
    return { position: [dragXZ[0], floorElevation, dragXZ[1]], snappedTo: 'floor' };
  }

  // Wall/ceiling — passthrough for now (future-ready)
  if (placement === 'wall' || placement === 'ceiling') {
    return { position: [dragXZ[0], Math.max(floorElevation, currentY), dragXZ[1]], snappedTo: 'free' };
  }

  // No placement metadata — free placement, but clamp to floor minimum
  return { position: [dragXZ[0], Math.max(floorElevation, currentY), dragXZ[1]], snappedTo: 'free' };
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
