

# Fix L-corner wall gaps

## Problem
When `generateCornerBlocks` was removed in v1.6.3, L-corners (2 walls meeting at 90°) got visible gaps and artifacts. T-junctions (3+ walls) work fine because the through-wall covers the junction. The gold/orange spikes in your screenshots are the exposed wall end-cap faces peeking through the gap.

## Solution
Re-enable `generateCornerBlocks` but **only for L-corners** (exactly 2 walls at a junction). T-junctions and cross-junctions (3+ walls) are excluded since they already look correct.

## Changes

### `src/lib/wallGeometry.tsx`
- In `generateCornerBlocks`, change the connection count filter from `< 2` to `!== 2` — only generate corner fills for exactly 2-wall junctions (L-corners), skipping T and + junctions that already work.

### `src/components/build/Walls3D.tsx` (home-view renderer)
- Import `generateCornerBlocks` from wallGeometry
- Call it with the floor's walls and elevation, add results to the rendered group

### `src/components/build/InteractiveWalls3D.tsx` (build-mode renderer)
- Same: import and render corner blocks alongside wall segments

Total: ~10 lines added across 3 files. The existing convex hull corner block logic handles the geometry correctly — it just needs to be called again, filtered to L-corners only.

