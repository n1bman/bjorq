/**
 * FPS Walk Mode — Lightweight 2D collision system (XZ plane)
 * Easter egg: Roberto Mode
 *
 * Checks player circle (radius) against wall segments,
 * allowing pass-through for door/passage/garage-door openings.
 */

import type { WallSegment } from '../store/types';

const PLAYER_RADIUS = 0.25;

interface Vec2 { x: number; z: number }

/** Distance from point P to line segment AB, returns closest point + dist */
function pointToSegmentInfo(p: Vec2, a: Vec2, b: Vec2): { dist: number; closest: Vec2; t: number } {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-8) return { dist: Math.hypot(p.x - a.x, p.z - a.z), closest: a, t: 0 };
  let t = ((p.x - a.x) * dx + (p.z - a.z) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closest = { x: a.x + t * dx, z: a.z + t * dz };
  const dist = Math.hypot(p.x - closest.x, p.z - closest.z);
  return { dist, closest, t };
}

/** Check if position t along a wall falls within a passable opening */
function isInOpening(wall: WallSegment, t: number): boolean {
  const wallLen = Math.hypot(wall.to[0] - wall.from[0], wall.to[1] - wall.from[1]);
  if (wallLen < 0.01) return false;

  for (const op of wall.openings) {
    if (op.type !== 'door' && op.type !== 'passage' && op.type !== 'garage-door') continue;
    const halfW = (op.width / wallLen) / 2;
    const center = op.offset;
    if (t >= center - halfW && t <= center + halfW) return true;
  }
  return false;
}

export interface CollisionResult {
  blocked: boolean;
  /** Adjusted position if sliding along wall */
  adjusted: { x: number; z: number };
}

/**
 * Test candidate position against all walls. Returns adjusted position
 * that slides along walls when blocked, or the candidate if clear.
 */
export function resolveCollision(
  candidate: { x: number; z: number },
  walls: WallSegment[],
  radius: number = PLAYER_RADIUS,
): { x: number; z: number } {
  let pos = { ...candidate };

  // Iterate a few times to resolve multi-wall contacts
  for (let iter = 0; iter < 3; iter++) {
    let pushed = false;
    for (const wall of walls) {
      const a: Vec2 = { x: wall.from[0], z: wall.from[1] };
      const b: Vec2 = { x: wall.to[0], z: wall.to[1] };
      const combinedRadius = wall.thickness / 2 + radius;

      const info = pointToSegmentInfo(pos, a, b);
      if (info.dist >= combinedRadius) continue;

      // Check if we're in a passable opening
      if (isInOpening(wall, info.t)) continue;

      // Push player out of wall
      const penetration = combinedRadius - info.dist;
      if (info.dist < 1e-6) {
        // Exactly on the wall line — push perpendicular
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dz);
        if (len > 0) {
          pos.x += (-dz / len) * penetration;
          pos.z += (dx / len) * penetration;
          pushed = true;
        }
      } else {
        const nx = (pos.x - info.closest.x) / info.dist;
        const nz = (pos.z - info.closest.z) / info.dist;
        pos.x += nx * penetration;
        pos.z += nz * penetration;
        pushed = true;
      }
    }
    if (!pushed) break;
  }

  return pos;
}

/** Check if a position is clear of all walls (for spawn validation) */
export function isPositionClear(
  pos: { x: number; z: number },
  walls: WallSegment[],
  radius: number = 0.3,
): boolean {
  for (const wall of walls) {
    const a: Vec2 = { x: wall.from[0], z: wall.from[1] };
    const b: Vec2 = { x: wall.to[0], z: wall.to[1] };
    const combinedRadius = wall.thickness / 2 + radius;
    const info = pointToSegmentInfo(pos, a, b);
    if (info.dist < combinedRadius && !isInOpening(wall, info.t)) return false;
  }
  return true;
}
