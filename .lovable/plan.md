

# Plan: Fix room detection for concave shapes + fix material side orientation

## Problem 1: Room detection fails for concave shapes

After tracing the algorithm carefully, the issue is in the **supercycle filter** in `findMinimalCycles`. For concave shapes (like the user's E/C-shaped house), the "turn right" algorithm can produce small degenerate cycles at concave corners. The supercycle filter then sees these small cycles' centroids inside the main room polygon and removes the main room as a "supercycle". The small cycles are later filtered by the `area < 0.5` check in `detectRooms`, but by then the valid room is already gone.

**Fix**: Move the area filter BEFORE the supercycle check. Filter out cycles with `polygonArea < 0.5` inside `findMinimalCycles` before running the supercycle logic.

Additionally, add comprehensive debug logging that reports:
- Wall count at each stage (original → healed → split)
- Graph node count and dead-end nodes (nodes with only 1 neighbor)
- Cycles found (count + vertex counts)
- Cycles after supercycle filter

## Problem 2: Material "Utsida"/"Insida" is inverted

The wall inspector's "Utsida"/"Insida" buttons set legacy `materialId`/`interiorMaterialId`. These map to the +z/-z faces of the BoxGeometry, which correspond to the **left/right** sides of the wall's `from→to` direction. Whether "left" is actually the exterior depends on how the wall was drawn — this is arbitrary.

**Fix**: Change the wall inspector to use `leftMaterialId`/`rightMaterialId` and determine which side is "inside" vs "outside" by checking which side faces toward the nearest room's centroid (same approach as `setRoomMaterial`). If no room context exists, fall back to the current behavior.

## Files changed

1. **`src/lib/roomDetection.ts`**
   - In `findMinimalCycles`: filter cycles by area before supercycle check (~5 lines)
   - In `detectRooms`: enhance debug logging with node/edge details (~10 lines)

2. **`src/components/build/BuildInspector.tsx`**
   - Change `handleSetMaterial` to use `leftMaterialId`/`rightMaterialId` with room-aware side detection (~25 lines)
   - Determine "Utsida"/"Insida" based on room centroid position relative to wall normal

