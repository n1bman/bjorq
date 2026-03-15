/**
 * FPS Walk Mode — Spawn point resolution
 * Easter egg: Roberto Mode
 *
 * Finds the device marker named "Roberto" and validates its spawn position.
 */

import type { DeviceMarker, WallSegment, Floor } from '../store/types';
import { isPositionClear } from './fpsCollision';

export interface SpawnResult {
  position: [number, number, number]; // world coords
  floorId: string;
  elevation: number;
}

const EYE_HEIGHT = 1.80;

/**
 * Find the "Roberto" vacuum marker and compute a valid FPS spawn point.
 * Returns null if no Roberto exists or spawn is completely stuck.
 */
export function findRobertoSpawn(
  markers: DeviceMarker[],
  floors: Floor[],
): SpawnResult | null {
  const roberto = markers.find(
    (m) => m.kind === 'egg' && m.name.toLowerCase().includes('roberto'),
  );
  if (!roberto) return null;

  const floor = floors.find((f) => f.id === roberto.floorId);
  const elevation = floor?.elevation ?? 0;
  const walls = floor?.walls ?? [];

  let spawnX = roberto.position[0];
  let spawnZ = roberto.position[2];

  // Validate spawn — nudge if inside a wall
  if (!isPositionClear({ x: spawnX, z: spawnZ }, walls)) {
    const nudged = nudgeToSafety(spawnX, spawnZ, walls);
    if (!nudged) return null; // completely stuck
    spawnX = nudged.x;
    spawnZ = nudged.z;
  }

  return {
    position: [spawnX, elevation + EYE_HEIGHT, spawnZ],
    floorId: roberto.floorId,
    elevation,
  };
}

/** Try 8 directions at increasing distances to find a clear spot */
function nudgeToSafety(
  x: number,
  z: number,
  walls: WallSegment[],
): { x: number; z: number } | null {
  const directions = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [0.707, 0.707], [-0.707, 0.707], [0.707, -0.707], [-0.707, -0.707],
  ];

  for (let dist = 0.5; dist <= 2.0; dist += 0.5) {
    for (const [dx, dz] of directions) {
      const candidate = { x: x + dx * dist, z: z + dz * dist };
      if (isPositionClear(candidate, walls)) return candidate;
    }
  }
  return null;
}
