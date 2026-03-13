/**
 * wallMountPlacement.ts — Phase C1: Wall-Mounted Object Placement
 *
 * Pure utility functions for computing wall-mount transforms,
 * checking eligibility, and converting click points to mount info.
 */

import type { WallSegment, WallMountInfo, AssetPlacement } from '../store/types';

/** Categories that are wall-mountable by default */
const WALL_MOUNT_CATEGORIES = new Set(['lighting', 'decor']);

/** Small offset from wall surface to prevent z-fighting */
const WALL_MOUNT_OFFSET = 0.02; // meters

/** Default height for wall-mounted objects */
const DEFAULT_MOUNT_HEIGHT = 1.5; // meters from floor

/**
 * Check if a catalog item is eligible for wall mounting.
 * Uses explicit placement field or falls back to category allowlist.
 */
export function isWallMountable(item: {
  placement?: AssetPlacement;
  category?: string;
}): boolean {
  if (item.placement === 'wall') return true;
  if (item.category && WALL_MOUNT_CATEGORIES.has(item.category)) return true;
  return false;
}

/**
 * Compute wall direction, length, and normals for a wall segment.
 */
function wallGeometry(wall: WallSegment) {
  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const length = Math.sqrt(dx * dx + dz * dz);
  const dirX = length > 0.001 ? dx / length : 1;
  const dirZ = length > 0.001 ? dz / length : 0;
  // Left normal (perpendicular CCW): (-dz, dx) normalized
  const leftNX = -dirZ;
  const leftNZ = dirX;
  const angle = Math.atan2(dz, dx);
  return { dx, dz, length, dirX, dirZ, leftNX, leftNZ, angle };
}

/**
 * Compute world-space position and rotation for a wall-mounted object.
 */
export function computeWallMountTransform(
  wall: WallSegment,
  faceSide: 'left' | 'right',
  offsetAlongWall: number,
  heightOnWall: number,
  elevation = 0,
): { position: [number, number, number]; rotation: [number, number, number] } {
  const { dirX, dirZ, leftNX, leftNZ, angle, length } = wallGeometry(wall);

  // Position along wall
  const posAlongX = wall.from[0] + dirX * length * offsetAlongWall;
  const posAlongZ = wall.from[1] + dirZ * length * offsetAlongWall;

  // Normal offset (push out from wall surface)
  const sign = faceSide === 'left' ? 1 : -1;
  const normalOffset = sign * (wall.thickness / 2 + WALL_MOUNT_OFFSET);

  const x = posAlongX + leftNX * normalOffset;
  const z = posAlongZ + leftNZ * normalOffset;
  const y = heightOnWall + elevation;

  // Rotation: object faces away from wall (along the normal)
  // Base rotation aligns object's -Z to the wall normal
  const rotY = faceSide === 'left'
    ? -angle + Math.PI / 2   // face outward from left side
    : -angle - Math.PI / 2;  // face outward from right side

  return {
    position: [x, y, z],
    rotation: [0, rotY, 0],
  };
}

/**
 * Convert a 3D click point on a wall surface into WallMountInfo.
 * Determines faceSide, offsetAlongWall, and heightOnWall.
 */
export function clickToWallMount(
  wall: WallSegment,
  clickPoint: [number, number, number],
  elevation = 0,
): WallMountInfo {
  const { dirX, dirZ, leftNX, leftNZ, length } = wallGeometry(wall);

  // Project click point onto wall axis to get offset
  const fromClickX = clickPoint[0] - wall.from[0];
  const fromClickZ = clickPoint[2] - wall.from[1];
  const projAlongWall = fromClickX * dirX + fromClickZ * dirZ;
  const offsetAlongWall = Math.max(0.05, Math.min(0.95, projAlongWall / length));

  // Determine face side from click position relative to wall center
  const midX = (wall.from[0] + wall.to[0]) / 2;
  const midZ = (wall.from[1] + wall.to[1]) / 2;
  const toClickX = clickPoint[0] - midX;
  const toClickZ = clickPoint[2] - midZ;
  const dot = toClickX * leftNX + toClickZ * leftNZ;
  const faceSide: 'left' | 'right' = dot > 0 ? 'left' : 'right';

  // Height on wall
  const heightOnWall = Math.max(0.3, Math.min(wall.height - 0.1, clickPoint[1] - elevation));

  return {
    wallId: wall.id,
    faceSide,
    offsetAlongWall,
    heightOnWall: Math.round(heightOnWall * 100) / 100,
  };
}

/**
 * Recompute position/rotation from wallMountInfo (for drag updates or reload).
 */
export function recomputeWallMountPosition(
  wall: WallSegment,
  mountInfo: WallMountInfo,
  elevation = 0,
) {
  return computeWallMountTransform(
    wall,
    mountInfo.faceSide,
    mountInfo.offsetAlongWall,
    mountInfo.heightOnWall,
    elevation,
  );
}

/**
 * Constrain a drag delta to wall-parallel movement (slide along wall + up/down).
 * Returns updated WallMountInfo.
 */
export function constrainDragToWall(
  wall: WallSegment,
  currentMount: WallMountInfo,
  dragDeltaWorld: [number, number, number],
): WallMountInfo {
  const { dirX, dirZ, length } = wallGeometry(wall);

  // Project drag onto wall direction for offset change
  const alongWallDelta = dragDeltaWorld[0] * dirX + dragDeltaWorld[2] * dirZ;
  const newOffset = Math.max(0.05, Math.min(0.95, currentMount.offsetAlongWall + alongWallDelta / length));

  // Height change from Y delta
  const newHeight = Math.max(0.3, Math.min(wall.height - 0.1, currentMount.heightOnWall + dragDeltaWorld[1]));

  return {
    ...currentMount,
    offsetAlongWall: Math.round(newOffset * 1000) / 1000,
    heightOnWall: Math.round(newHeight * 100) / 100,
  };
}
