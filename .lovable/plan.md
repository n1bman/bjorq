

# Phase A3 — True Mitered Wall Joins

## Current State Analysis

Each wall is a `BoxGeometry` with flat rectangular ends. At junctions, walls are trimmed inward by `max(connectedThickness, ownThickness)/2` and a convex-hull corner block fills the gap. This creates visible seams because the corner block is a separate mesh with different shading/lighting behavior.

The fix: replace the flat-ended box with a **mitered box** — a custom `BufferGeometry` where the end vertices are shifted along the wall direction to meet the connected wall flush. No separate corner fill needed for 2-wall L-corners.

## Technical Approach

### Custom Mitered Wall Geometry

Instead of `BoxGeometry`, build a `BufferGeometry` with 8 vertices where the "from" and "to" ends are cut at the junction bisector angle:

```text
Current (box):          Mitered (L-corner):
 ┌──────────┐            ┌──────────┐
 │          │            │         /
 │  wall A  │            │  wall A/
 │          │            │       /
 └──────────┘            └──────/
```

Each wall end has two corners (left side, right side). For a junction between two walls, the miter offset for each corner is computed from the angle between walls. At 90° this creates a 45° cut. At other angles the cut follows the bisector.

### Material Group Compatibility

The current system uses a 6-material array: `[+x edge, -x edge, +y top, -y bottom, +z left/exterior, -z right/interior]`. The mitered geometry must preserve groups 4 (+z = left face) and 5 (-z = right face) as the primary visible wall surfaces. This is achieved by manually constructing the BufferGeometry with the same group indices as BoxGeometry uses.

### Junction Logic

| Junction type | Behavior |
|---|---|
| **Dead end** (1 wall) | Flat rectangular end (no miter) |
| **L-corner** (2 walls) | Both walls mitered at bisector. Corner block eliminated. |
| **T-junction** (3 walls) | Through-wall stays flat. Terminating wall butts against through-wall side. Small residual corner fill if needed. |
| **Cross** (4+ walls) | Pair-wise miter where possible. Corner fill as fallback for residual gaps only. |

## Implementation Plan

### Step 1 — Add miter computation functions

**File: `src/lib/wallGeometry.tsx`**

New function `computeMiterOffsets(wall, allWalls, eps)` that returns per-corner offsets at `from` and `to` ends:

```typescript
interface MiterResult {
  // How far each corner shifts along wall direction (positive = extend, negative = retract)
  fromLeft: number;   // left corner at 'from' end
  fromRight: number;  // right corner at 'from' end
  toLeft: number;     // left corner at 'to' end
  toRight: number;    // right corner at 'to' end
}
```

Logic for each endpoint:
1. Find walls connected at that point
2. If 0 connections → offset = 0 (flat end)
3. If 1 connection → compute angle between this wall and neighbor, bisector gives miter angle, offset = `halfThickness * tan(miterAngle)`
4. If 2+ connections → for L-like pairs, use the most aligned neighbor; for T-junctions, detect through-wall vs terminating wall

### Step 2 — Build mitered BufferGeometry

New function `createMiteredWallGeometry(length, height, thickness, miterOffsets)` returning a `THREE.BufferGeometry` with:

- 8 vertices forming the mitered box
- 12 triangles (2 per face × 6 faces)
- Material groups matching BoxGeometry convention:
  - Group 0: +x end face (edge material)
  - Group 1: -x end face (edge material)
  - Group 2: +y top face (edge material)
  - Group 3: -y bottom face (edge material)
  - Group 4: +z front/left face (exterior material)
  - Group 5: -z back/right face (interior material)
- Normals computed per-face for correct lighting

### Step 3 — Update `generateWallSegments`

Replace the no-openings path:

```typescript
// OLD:
<boxGeometry args={[length, wallHeight, wall.thickness]} />

// NEW:
<primitive object={createMiteredWallGeometry(length, height, thickness, miterOffsets)} />
```

The mesh position and rotation remain identical — the geometry itself handles the miter cuts in local space.

For walls **with openings**: the first and last sub-segments get mitered ends at the wall endpoints. Middle segments around openings keep flat rectangular ends (they don't touch junctions).

### Step 4 — Reduce corner blocks to fallback

Update `generateCornerBlocks`:
- Skip junctions with exactly 2 walls (L-corners) — the miter handles these
- Keep corner fills only for 3+ wall junctions where residual geometry gaps remain
- Reduce corner fill size since mitered walls extend further into the junction

### Step 5 — Keep `computeWallMitering` for opening calculations

The existing `computeWallMitering` function (used for opening position math and wall center calculation) remains unchanged. The new miter system only affects geometry generation, not opening placement.

## Files Changed

| File | Change |
|---|---|
| `src/lib/wallGeometry.tsx` | Add `computeMiterOffsets`, `createMiteredWallGeometry`. Update `generateWallSegments` to use mitered geometry. Update `generateCornerBlocks` to skip 2-wall junctions. |

No other files change. The API surface (`generateWallSegments`, `generateCornerBlocks`) stays identical.

## What Is Preserved

- Wall drawing flow and snapping
- Room generation and polygon detection
- Opening placement (uses unchanged `computeWallMitering`)
- Save/load compatibility (no data model changes)
- Wall-face foundation (`wallFaces.ts` unchanged — normals still computed from `from`/`to`)
- Phase C1 wall-mount placement
- Material system (6-group array preserved in custom geometry)

## Risk Mitigation

- If miter computation produces degenerate results (very acute angles < 10°, near-zero-length walls), fall back to flat rectangular ends
- The old box path remains available as fallback per-wall
- Corner blocks remain for 3+ junctions as safety net

