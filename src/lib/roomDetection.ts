import type { WallSegment, Room } from '../store/types';

const EPSILON = 0.05; // 5cm tolerance for node matching

function keyFor(p: [number, number]): string {
  return `${Math.round(p[0] / EPSILON)},${Math.round(p[1] / EPSILON)}`;
}

function snapPoint(p: [number, number]): [number, number] {
  return [
    Math.round(p[0] / EPSILON) * EPSILON,
    Math.round(p[1] / EPSILON) * EPSILON,
  ];
}

interface Graph {
  [key: string]: { node: [number, number]; neighbors: string[] };
}

function buildGraph(walls: WallSegment[]): Graph {
  const g: Graph = {};
  for (const w of walls) {
    const fk = keyFor(w.from);
    const tk = keyFor(w.to);
    if (!g[fk]) g[fk] = { node: snapPoint(w.from), neighbors: [] };
    if (!g[tk]) g[tk] = { node: snapPoint(w.to), neighbors: [] };
    if (!g[fk].neighbors.includes(tk)) g[fk].neighbors.push(tk);
    if (!g[tk].neighbors.includes(fk)) g[tk].neighbors.push(fk);
  }
  return g;
}

function angle(from: [number, number], to: [number, number]): number {
  return Math.atan2(to[1] - from[1], to[0] - from[0]);
}

// Find minimal cycles using the "next edge" approach (always turn right)
function findMinimalCycles(graph: Graph): string[][] {
  const cycles: string[][] = [];
  const usedEdges = new Set<string>();

  const edgeKey = (a: string, b: string) => `${a}->${b}`;

  for (const startKey of Object.keys(graph)) {
    for (const firstNeighbor of graph[startKey].neighbors) {
      const ek = edgeKey(startKey, firstNeighbor);
      if (usedEdges.has(ek)) continue;

      const path: string[] = [startKey];
      let prev = startKey;
      let current = firstNeighbor;
      let found = false;

      for (let i = 0; i < 50; i++) {
        path.push(current);
        if (current === startKey) { found = true; break; }

        const node = graph[current];
        if (!node || node.neighbors.length < 2) break;

        // Pick next neighbor by turning right (smallest CCW angle from incoming direction)
        const inAngle = angle(node.node, graph[prev].node);
        let bestKey = '';
        let bestAngle = Infinity;

        for (const nk of node.neighbors) {
          if (nk === prev) continue;
          let a = angle(node.node, graph[nk].node) - inAngle;
          if (a < 0) a += Math.PI * 2;
          if (a < bestAngle) { bestAngle = a; bestKey = nk; }
        }

        if (!bestKey) break;
        prev = current;
        current = bestKey;
      }

      if (found && path.length >= 4) { // 4 = 3 nodes + closing node
        // Normalize cycle to avoid duplicates
        const cycle = path.slice(0, -1);
        const minIdx = cycle.indexOf(cycle.reduce((a, b) => a < b ? a : b));
        const normalized = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
        const key = normalized.join(',');
        const revKey = [...normalized].reverse().join(',');

        if (!cycles.some((c) => c.join(',') === key || c.join(',') === revKey)) {
          cycles.push(normalized);
          // Mark edges as used
          for (let i = 0; i < path.length - 1; i++) {
            usedEdges.add(edgeKey(path[i], path[i + 1]));
          }
        }
      }
    }
  }

  // Filter out supercycles that contain other cycles
  if (cycles.length <= 1) return cycles;

  const centroids = cycles.map((cycle) => {
    const pts = cycle.map((k) => graph[k].node);
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    return [cx, cy] as [number, number];
  });

  const polyForCycle = (cycle: string[]) => cycle.map((k) => graph[k].node);

  const pip = (px: number, py: number, poly: [number, number][]) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  };

  // A cycle is a supercycle if another cycle's centroid is inside it
  const filtered = cycles.filter((cycle, i) => {
    const poly = polyForCycle(cycle);
    for (let j = 0; j < cycles.length; j++) {
      if (i === j) continue;
      if (pip(centroids[j][0], centroids[j][1], poly)) return false;
    }
    return true;
  });

  return filtered;
}

function polygonArea(points: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return Math.abs(area) / 2;
}

/** Compute overlap ratio between two polygons using bounding-box approximation */
function polygonOverlap(a: [number, number][], b: [number, number][]): number {
  const bbox = (p: [number, number][]) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of p) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return { minX, maxX, minY, maxY };
  };
  const ba = bbox(a);
  const bb = bbox(b);
  const ox = Math.max(0, Math.min(ba.maxX, bb.maxX) - Math.max(ba.minX, bb.minX));
  const oy = Math.max(0, Math.min(ba.maxY, bb.maxY) - Math.max(ba.minY, bb.minY));
  const overlapArea = ox * oy;
  const areaA = (ba.maxX - ba.minX) * (ba.maxY - ba.minY);
  const areaB = (bb.maxX - bb.minX) * (bb.maxY - bb.minY);
  if (areaA === 0 || areaB === 0) return 0;
  return overlapArea / Math.min(areaA, areaB);
}

const generateId = () => Math.random().toString(36).slice(2, 10);

/**
 * Detect rooms from walls. Preserves existing room metadata (name, materials)
 * by matching new polygons to existing rooms via polygon overlap.
 */
export function detectRooms(walls: WallSegment[], existingRooms?: Room[]): Room[] {
  if (walls.length < 3) return [];
  
  const graph = buildGraph(walls);
  const cycles = findMinimalCycles(graph);

  // Collect existing "Rum N" numbers to avoid duplicates
  const usedNumbers = new Set<number>();
  if (existingRooms) {
    for (const er of existingRooms) {
      const m = er.name.match(/^Rum (\d+)$/);
      if (m) usedNumbers.add(parseInt(m[1], 10));
    }
  }

  let roomCounter = 1;
  const getNextName = () => {
    while (usedNumbers.has(roomCounter)) roomCounter++;
    usedNumbers.add(roomCounter);
    return `Rum ${roomCounter}`;
  };

  const usedExistingIds = new Set<string>();

  return cycles
    .map((cycle) => {
      const polygon: [number, number][] = cycle.map((k) => graph[k].node);
      const area = polygonArea(polygon);
      if (area < 0.5) return null; // Skip tiny areas

      // Find wall IDs that form this room
      const wallIds: string[] = [];
      for (let i = 0; i < cycle.length; i++) {
        const a = cycle[i];
        const b = cycle[(i + 1) % cycle.length];
        const wall = walls.find((w) => {
          const fk = keyFor(w.from);
          const tk = keyFor(w.to);
          return (fk === a && tk === b) || (fk === b && tk === a);
        });
        if (wall) wallIds.push(wall.id);
      }

      // Try to match with existing room by polygon overlap (skip already matched)
      let matchedRoom: Room | undefined;
      if (existingRooms) {
        let bestOverlap = 0;
        for (const er of existingRooms) {
          if (usedExistingIds.has(er.id)) continue;
          if (!er.polygon || er.polygon.length < 3) continue;
          const overlap = polygonOverlap(polygon, er.polygon);
          if (overlap > 0.6 && overlap > bestOverlap) {
            bestOverlap = overlap;
            matchedRoom = er;
          }
        }
      }

      if (matchedRoom) {
        usedExistingIds.add(matchedRoom.id);
        return {
          ...matchedRoom,
          wallIds,
          polygon,
        } as Room;
      }

      return {
        id: generateId(),
        name: getNextName(),
        wallIds,
        polygon,
      } as Room;
    })
    .filter(Boolean) as Room[];
}
