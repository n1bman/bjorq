

# Fix: Wall Z-fighting + Props Loading

## Problem Analysis

1. **Wall glitching (z-fighting)**: All wall materials use `side: THREE.DoubleSide`. For `BoxGeometry`, every face already points outward — `DoubleSide` is unnecessary and causes z-fighting where two wall boxes share a face at corners. The back-face renders at the exact same depth as the front-face of the adjacent wall, creating the shimmering/doubling effect.

2. **GroundPlane + TerrainEnvironment overlap**: Both render at `y = -0.01`, causing ground-level z-fighting.

3. **Props "Kunde inte ladda: KIVIK-4"**: The blob URL restoration in `useValidPropUrl` looks correct. This is likely a catalog `fileData` issue — if the model was >4MB, it was never stored as base64, so it can't be reconstructed. This is a known limitation per project constraints.

## Changes

### 1. `src/lib/wallMaterials.ts` — Remove `DoubleSide`
Change all three materials from `side: THREE.DoubleSide` to `side: THREE.FrontSide` (default). BoxGeometry faces are already correctly oriented outward. This eliminates the z-fighting between overlapping wall segments at corners.

### 2. `src/components/build/GroundPlane.tsx` — Lower position
Move the ground plane down slightly to `y = -0.02` to avoid z-fighting with terrain and floor geometry.

### 3. `src/components/Scene3D.tsx` — Raise terrain
Move `InlineTerrainEnvironment3D`'s ground circle to `y = -0.015` (between ground plane and walls) to avoid z-fighting with the main ground plane.

### 4. `src/components/build/BuildScene3D.tsx` — Same terrain fix
Same `y = -0.015` adjustment for `InlineTerrain3D`.

