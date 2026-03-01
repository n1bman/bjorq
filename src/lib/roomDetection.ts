import type { WallSegment, Room } from '../store/types';

const EPSILON = 0.05; // 5cm tolerance for node matching

function keyFor(p: [number, number]): string {
  return `${Math.round(p[0] / EPSILON) * EPSILON},${Math.round(p[1] / EPSILON) * EPSILON}`;
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

  return cycles;
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

const generateId = () => Math.random().toString(36).slice(2, 10);

export function detectRooms(walls: WallSegment[]): Room[] {
  if (walls.length < 3) return [];
  
  const graph = buildGraph(walls);
  const cycles = findMinimalCycles(graph);

  return cycles
    .map((cycle, idx) => {
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

      return {
        id: generateId(),
        name: `Rum ${idx + 1}`,
        wallIds,
        polygon,
      } as Room;
    })
    .filter(Boolean) as Room[];
}
