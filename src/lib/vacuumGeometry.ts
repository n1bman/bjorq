/**
 * Point-in-polygon test using ray casting.
 */
export function pointInPolygon(px: number, pz: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], zi = polygon[i][1];
    const xj = polygon[j][0], zj = polygon[j][1];
    if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Get a random point inside a polygon using bounding-box + rejection sampling.
 */
export function randomPointInPolygon(polygon: [number, number][]): [number, number] {
  if (polygon.length < 3) return [0, 0];
  
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of polygon) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  for (let attempt = 0; attempt < 100; attempt++) {
    const x = minX + Math.random() * (maxX - minX);
    const z = minZ + Math.random() * (maxZ - minZ);
    if (pointInPolygon(x, z, polygon)) return [x, z];
  }

  // Fallback: centroid
  const cx = polygon.reduce((a, p) => a + p[0], 0) / polygon.length;
  const cz = polygon.reduce((a, p) => a + p[1], 0) / polygon.length;
  return [cx, cz];
}
