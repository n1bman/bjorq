

# Fix: BuildBottomDock module resolution + Invisible walls

## Problem 1: Build Error
`BuildBottomDock.tsx` exists on disk with correct content, but Vite/Rollup fails to resolve it. This is a build cache issue. The fix is to re-write the file with identical content to force the build system to re-index it. Additionally, we'll add a trivial change (a newline/comment) to `BuildModeV2.tsx` to invalidate its transform cache.

## Problem 2: Invisible Side Walls
Looking at the screenshot, walls on one side of the house are invisible. This is **not** caused by camera proximity (no such feature exists in the code). The issue is the `createWallMaterials` function in `wallMaterials.ts`:

The material array maps faces as: `[edge, edge, edge, edge, exterior, interior]` — meaning only `+z` and `-z` faces get the wall colors. The `+x` and `-x` faces (the short ends/sides of the wall) use the `edge` material. However, the real issue is that the **BoxGeometry face orientation depends on wall rotation**. When a wall is rotated by `-angle`, the "front" and "back" faces swap relative to the camera. For walls oriented along certain axes, the exterior/interior faces end up pointing away from the camera, and the edge material (which may appear dark/invisible) faces the viewer.

The fix: The `edge` material should use the same color as the exterior material (not a separate dark color), and we should ensure both `+z` and `-z` faces render visible colors. Currently `resolveWallColors` sets `edgeColor` to the exterior color, so the edge material should be visible. Let me verify the actual material creation more carefully — the issue may be that materials are created with `side: FrontSide` (default) and backface culling hides certain faces when viewed from inside.

**Root cause**: Three.js `MeshStandardMaterial` defaults to `side: THREE.FrontSide`, meaning backfaces are culled. When a wall segment is viewed from the interior side, the exterior-facing material's backface is invisible. The fix is to set `side: THREE.DoubleSide` on all wall materials, or at minimum on the exterior and interior materials.

## Changes

1. **Re-write `BuildBottomDock.tsx`** — force Vite to re-index
2. **Update `wallMaterials.ts`** — add `side: THREE.DoubleSide` to all materials in the array to prevent backface culling from making walls invisible from certain angles
3. **Touch `BuildModeV2.tsx`** — add a comment to invalidate transform cache

