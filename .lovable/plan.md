

# Plan: Fix room detection graph connectivity + material orientation

## Root cause identified

The **`keyFor` function** has an inherent boundary problem that causes room detection to fail unpredictably.

`keyFor` quantizes coordinates to a 0.15m grid using `Math.round(x / 0.15)`. Two points that are very close together (well within the 0.15m tolerance) can land in **different grid cells** if they straddle a cell boundary:

```text
Point A: x = 1.124  →  Math.round(1.124 / 0.15) = Math.round(7.493) = 7
Point B: x = 1.126  →  Math.round(1.126 / 0.15) = Math.round(7.507) = 8

Same corner, different graph nodes → broken loop → no room detected
```

This is a classic spatial hashing boundary problem. `healWalls` snaps to the same grid, but the snap itself can land on a boundary. The result is non-deterministic: sometimes rooms are detected, sometimes not, depending on exact wall coordinates.

The material "inside/outside" issue is a **consequence**, not a cause. Without a detected room, `resolveWallColors` falls back to the legacy `materialId`/`interiorMaterialId` mapping, which assigns +z as "exterior" and -z as "interior". Which physical side these map to depends on the wall's `from→to` direction — which is arbitrary. Once a room IS detected, `setRoomMaterial` correctly determines interior/exterior using polygon winding. But no room = no correct orientation.

## Fix

### 1. Replace `keyFor` with distance-based point deduplication (`src/lib/roomDetection.ts`)

Instead of hashing coordinates to grid cells, collect all unique points after healing+splitting using **distance-based deduplication** (any two points within EPSILON are the same node). Assign numeric IDs. Build the graph using these IDs.

```text
Before: keyFor([1.124, 0]) → "7,0"    keyFor([1.126, 0]) → "8,0"   ← BROKEN
After:  findPointId([1.124, 0]) → 3    findPointId([1.126, 0]) → 3  ← CORRECT
```

This eliminates all grid-boundary issues. The change is localized to `buildGraph` and how it's called from `detectRooms`.

### 2. Add comprehensive debug logging (`src/lib/roomDetection.ts`)

Enhance `detectRooms` logging to output:
- Unique node count, edge count, dead-end list with coordinates
- Cycles found before and after supercycle filter
- Full graph dump when no cycles found (with distance to nearest other node for dead-ends)

### 3. Default wall color when no room exists (`src/lib/wallMaterials.ts`)

When no `leftMaterialId`/`rightMaterialId` is set and no legacy material is set, use the **same** default color on both sides instead of different exterior/interior colors. This prevents confusing visual feedback before rooms are detected.

## Files changed

1. **`src/lib/roomDetection.ts`** — Replace `keyFor`-based graph with distance-based point ID system; enhance logging (~40 lines changed)
2. **`src/lib/wallMaterials.ts`** — Use same default color on both sides when no material is explicitly set (~2 lines changed)

## What does NOT need to change

- **Wall creation** (`addWall`, `BuildScene3D`, `useCanvas2DTools`): Wall orientation/direction is irrelevant for room detection. The graph is undirected.
- **`setRoomMaterial`**: Already correctly determines interior side using polygon winding. Works once rooms are detected.
- **`findMinimalCycles`**: The algorithm itself is correct. The issue is in the graph input, not the traversal.

