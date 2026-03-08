

# Plan: Replace broken supercycle filter with outer-face removal

## Root cause

The supercycle filter uses point-in-polygon (PIP) to check if another cycle's centroid is inside a given cycle. For **concave polygons** (L-shaped, U-shaped rooms), this test produces false positives. The small room's centroid can test as "inside" the concave L-shaped remaining area, causing BOTH the outer face AND the valid large room to be rejected.

From the console logs:
- 3 raw cycles found: small room (~6m²), large remaining area (57.60m²), outer boundary (63.76m²)
- Outer boundary correctly rejected (contains centroid of large area)
- Large remaining area **incorrectly** rejected (centroid-PIP false positive for concave polygon)
- Result: only 1 room instead of 2

## Fix

**Replace the centroid-PIP supercycle filter with simple "remove the largest-area cycle".**

In any connected planar graph, the outer (unbounded) face is always the cycle with the largest area. This is mathematically guaranteed — no PIP tests needed, no issues with concave polygons.

### Changes to `src/lib/roomDetection.ts`

Replace lines 184-222 (the entire `centroids` / `pip` / supercycle filter block) with:

```typescript
if (validCycles.length <= 1) return validCycles;

// The outer face is always the cycle with the largest area — remove it
let maxArea = 0;
let maxIdx = -1;
for (let i = 0; i < validCycles.length; i++) {
  const pts = validCycles[i].map((k) => graph[k].node);
  const a = polygonArea(pts);
  if (a > maxArea) { maxArea = a; maxIdx = i; }
}

const filtered = validCycles.filter((_, i) => {
  if (i === maxIdx) {
    console.log(`[findMinimalCycles] REJECTED (outer face): nodes=[${validCycles[i].join(',')}] area=${maxArea.toFixed(2)}m²`);
    return false;
  }
  return true;
});

console.log(`[findMinimalCycles] Final accepted cycles: ${filtered.length}`);
return filtered;
```

This removes ~30 lines of complex centroid/PIP/supercycle logic and replaces it with ~15 lines of simple max-area detection. It correctly handles concave, convex, and L-shaped room polygons.

