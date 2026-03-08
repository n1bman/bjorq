import type { WallSegment, Room } from '../store/types';
import { generateId } from './buildUtils';

const EPSILON = 0.15; // 15cm tolerance for node matching (increased to handle older imprecise walls)

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
        if (!node) break;
        // Dead-end: only neighbor is where we came from
        const otherNeighbors = node.neighbors.filter(nk => nk !== prev);
        if (otherNeighbors.length === 0) break;

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

  // Filter out tiny degenerate cycles BEFORE supercycle check
  const validCycles = cycles.filter((cycle) => {
    const pts = cycle.map((k) => graph[k].node);
    return polygonArea(pts) >= 0.5;
  });

  if (validCycles.length <= 1) return validCycles;

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

export function polygonArea(points: [number, number][]): number {
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


/**
 * Split walls at T-junctions: if a wall endpoint lands on the middle
 * of another wall segment, split that segment into two so the graph
 * recognizes the connection.
 */
function splitAtTJunctions(walls: WallSegment[]): WallSegment[] {
  // Collect all unique endpoints
  const endpoints: [number, number][] = [];
  for (const w of walls) {
    endpoints.push(w.from, w.to);
  }

  let result = [...walls];
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 5) {
    changed = false;
    iterations++;
    const nextResult: WallSegment[] = [];

    for (const wall of result) {
      // Collect split points on this wall — store actual endpoint coords
      const splits: { t: number; point: [number, number] }[] = [];

      for (const ep of endpoints) {
        // Skip if ep is near either endpoint of this wall
        const dFrom = Math.hypot(ep[0] - wall.from[0], ep[1] - wall.from[1]);
        const dTo = Math.hypot(ep[0] - wall.to[0], ep[1] - wall.to[1]);
        if (dFrom < EPSILON || dTo < EPSILON) continue;

        // Project ep onto wall segment
        const dx = wall.to[0] - wall.from[0];
        const dy = wall.to[1] - wall.from[1];
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) continue;
        const t = ((ep[0] - wall.from[0]) * dx + (ep[1] - wall.from[1]) * dy) / len2;
        const wallLen = Math.sqrt(len2);
        const tEps = EPSILON / wallLen;
        if (t <= tEps || t >= 1 - tEps) continue;

        // Check distance from ep to projected point
        const px = wall.from[0] + t * dx;
        const py = wall.from[1] + t * dy;
        const dist = Math.hypot(ep[0] - px, ep[1] - py);
        if (dist < EPSILON) {
          // Store t AND the actual endpoint coordinate
          splits.push({ t, point: [ep[0], ep[1]] });
        }
      }

      if (splits.length === 0) {
        nextResult.push(wall);
      } else {
        changed = true;
        // Sort splits by t and deduplicate
        splits.sort((a, b) => a.t - b.t);
        const wallLen = Math.sqrt(
          (wall.to[0] - wall.from[0]) ** 2 + (wall.to[1] - wall.from[1]) ** 2
        );
        const tDedup = wallLen > 0 ? EPSILON / wallLen : EPSILON;
        const unique = [splits[0]];
        for (let i = 1; i < splits.length; i++) {
          if (splits[i].t - unique[unique.length - 1].t > tDedup) unique.push(splits[i]);
        }

        // Use actual endpoint coordinates (not projected) so keyFor matches
        const points: [number, number][] = [wall.from];
        for (const s of unique) {
          points.push(s.point);
        }
        points.push(wall.to);

        for (let i = 0; i < points.length - 1; i++) {
          nextResult.push({
            ...wall,
            id: i === 0 ? wall.id : generateId(),
            from: points[i],
            to: points[i + 1],
            openings: i === 0 ? wall.openings : [],
          });
        }
      }
    }

    result = nextResult;
    // Re-collect endpoints after splits
    endpoints.length = 0;
    for (const w of result) {
      endpoints.push(w.from, w.to);
    }
  }

  return result;
}

const HEAL_THRESHOLD = 0.20; // 20cm — merge endpoints closer than this

/**
 * Heal walls by merging nearby endpoints that should be the same node.
 * Groups endpoints within HEAL_THRESHOLD and snaps them to the group centroid.
 */
export function healWalls(walls: WallSegment[]): { walls: WallSegment[]; healed: number } {
  // Collect all unique endpoints
  const allPts: { wallIdx: number; end: 'from' | 'to'; pt: [number, number] }[] = [];
  walls.forEach((w, i) => {
    allPts.push({ wallIdx: i, end: 'from', pt: [...w.from] });
    allPts.push({ wallIdx: i, end: 'to', pt: [...w.to] });
  });

  // Union-find to group nearby points
  const parent = allPts.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a: number, b: number) => { parent[find(a)] = find(b); };

  for (let i = 0; i < allPts.length; i++) {
    for (let j = i + 1; j < allPts.length; j++) {
      const dx = allPts[i].pt[0] - allPts[j].pt[0];
      const dy = allPts[i].pt[1] - allPts[j].pt[1];
      if (Math.hypot(dx, dy) < HEAL_THRESHOLD) {
        union(i, j);
      }
    }
  }

  // Build groups and compute centroids
  const groups = new Map<number, number[]>();
  for (let i = 0; i < allPts.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }

  let healed = 0;
  const result = walls.map((w) => ({ ...w, from: [...w.from] as [number, number], to: [...w.to] as [number, number] }));

  for (const members of groups.values()) {
    if (members.length <= 1) continue;
    // Centroid
    let cx = 0, cy = 0;
    for (const m of members) { cx += allPts[m].pt[0]; cy += allPts[m].pt[1]; }
    cx /= members.length;
    cy /= members.length;
    // Snap to grid-friendly value
    const snap: [number, number] = [
      Math.round(cx / EPSILON) * EPSILON,
      Math.round(cy / EPSILON) * EPSILON,
    ];
    for (const m of members) {
      const entry = allPts[m];
      const w = result[entry.wallIdx];
      const old = entry.end === 'from' ? w.from : w.to;
      if (Math.abs(old[0] - snap[0]) > 0.001 || Math.abs(old[1] - snap[1]) > 0.001) {
        healed++;
      }
      if (entry.end === 'from') { w.from = snap; } else { w.to = snap; }
    }
  }

  return { walls: result, healed };
}

/**
 * Detect rooms from walls. Preserves existing room metadata (name, materials)
 * by matching new polygons to existing rooms via polygon overlap.
 */
export function detectRooms(walls: WallSegment[], existingRooms?: Room[]): Room[] {
  if (walls.length < 3) return [];
  
  const { walls: healedWalls } = healWalls(walls);
  const splitWalls = splitAtTJunctions(healedWalls);
  const graph = buildGraph(splitWalls);
  const cycles = findMinimalCycles(graph);
  
  console.log(`[detectRooms] walls=${walls.length} healed=${healedWalls.length} split=${splitWalls.length} nodes=${Object.keys(graph).length} cycles=${cycles.length}`);

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

      // Find wall IDs that form this room — search in splitWalls (post T-junction)
      const wallIds: string[] = [];
      for (let i = 0; i < cycle.length; i++) {
        const a = cycle[i];
        const b = cycle[(i + 1) % cycle.length];
        // First try splitWalls, then fall back to original walls
        const wall = splitWalls.find((w) => {
          const fk = keyFor(w.from);
          const tk = keyFor(w.to);
          return (fk === a && tk === b) || (fk === b && tk === a);
        }) || healedWalls.find((w) => {
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
