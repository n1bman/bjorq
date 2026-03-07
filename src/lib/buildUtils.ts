import type { WallSegment, BuildGrid } from '../store/types';

const generateId = () => Math.random().toString(36).slice(2, 10);
export { generateId };

// ─── Snap to nearest existing wall node ───
export function snapToNode(
  pos: [number, number],
  walls: WallSegment[],
  threshold = 0.25,
): { snapped: [number, number]; isSnapped: boolean } {
  let best: [number, number] | null = null;
  let bestDist = threshold;
  for (const w of walls) {
    const df = Math.hypot(pos[0] - w.from[0], pos[1] - w.from[1]);
    if (df < bestDist) { bestDist = df; best = w.from; }
    const dt = Math.hypot(pos[0] - w.to[0], pos[1] - w.to[1]);
    if (dt < bestDist) { bestDist = dt; best = w.to; }
  }
  return best ? { snapped: best, isSnapped: true } : { snapped: pos, isSnapped: false };
}

// ─── Snap to grid ───
export function snapToGrid(x: number, z: number, grid: BuildGrid): [number, number] {
  if (!grid.enabled || grid.snapMode === 'off') return [x, z];
  const s = grid.sizeMeters;
  return [Math.round(x / s) * s, Math.round(z / s) * s];
}

// ─── Point-in-polygon (ray casting) ───
export function pointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ─── Distance from point to line segment, returns [distance, t parameter 0-1] ───
export function pointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): [number, number] {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return [Math.sqrt((px - ax) ** 2 + (py - ay) ** 2), 0];
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return [Math.sqrt((px - cx) ** 2 + (py - cy) ** 2), t];
}

// ─── Find nearest wall node (endpoint) near a world position ───
export function findNearestNode(
  wx: number, wz: number,
  walls: WallSegment[],
  threshold: number,
): { wallId: string; endpoint: 'from' | 'to'; pos: [number, number] } | null {
  for (const wall of walls) {
    const df = Math.sqrt((wx - wall.from[0]) ** 2 + (wz - wall.from[1]) ** 2);
    if (df < threshold) return { wallId: wall.id, endpoint: 'from', pos: wall.from };
    const dt = Math.sqrt((wx - wall.to[0]) ** 2 + (wz - wall.to[1]) ** 2);
    if (dt < threshold) return { wallId: wall.id, endpoint: 'to', pos: wall.to };
  }
  return null;
}

// ─── Find wall segment near a world position ───
export function findWallAtWorld(
  wx: number, wz: number,
  walls: WallSegment[],
  threshold: number,
): WallSegment | null {
  for (const wall of walls) {
    const [dist] = pointToSegment(wx, wz, wall.from[0], wall.from[1], wall.to[0], wall.to[1]);
    if (dist < threshold) return wall;
  }
  return null;
}

// ─── Find connected walls sharing the same node ───
export function findConnectedWalls(
  pos: [number, number],
  excludeWallId: string,
  walls: WallSegment[],
  eps = 0.01,
): { wallId: string; endpoint: 'from' | 'to' }[] {
  const result: { wallId: string; endpoint: 'from' | 'to' }[] = [];
  for (const wall of walls) {
    if (wall.id === excludeWallId) continue;
    if (Math.abs(wall.from[0] - pos[0]) < eps && Math.abs(wall.from[1] - pos[1]) < eps) {
      result.push({ wallId: wall.id, endpoint: 'from' });
    }
    if (Math.abs(wall.to[0] - pos[0]) < eps && Math.abs(wall.to[1] - pos[1]) < eps) {
      result.push({ wallId: wall.id, endpoint: 'to' });
    }
  }
  return result;
}

// ─── Find opening on a wall near world position ───
export function findOpeningAtWorld(
  wx: number, wz: number,
  walls: WallSegment[],
  threshold: number,
): { wall: WallSegment; openingId: string } | null {
  for (const wall of walls) {
    for (const op of wall.openings) {
      const opx = wall.from[0] + (wall.to[0] - wall.from[0]) * op.offset;
      const opz = wall.from[1] + (wall.to[1] - wall.from[1]) * op.offset;
      const dist = Math.sqrt((wx - opx) ** 2 + (wz - opz) ** 2);
      if (dist < threshold) return { wall, openingId: op.id };
    }
  }
  return null;
}

// ─── Angle lock (Shift key) ───
export function angleLock(from: [number, number], to: [number, number]): [number, number] {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const angle = Math.atan2(dz, dx);
  const len = Math.sqrt(dx * dx + dz * dz);
  // Snap to nearest 45° increment
  const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  return [from[0] + Math.cos(snapped) * len, from[1] + Math.sin(snapped) * len];
}
