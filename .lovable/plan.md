

# Fix Plan: Build Error + Wall/Object Visibility

## Issue 1: Build Error (BuildBottomDock)
`BuildBottomDock.tsx` exists on disk with correct content but Vite/Rollup cannot resolve it. This is a persistent caching issue. The fix is to **inline the BuildBottomDock component directly into BuildModeV2.tsx**, eliminating the separate import entirely. This guarantees the module resolution issue cannot recur.

## Issue 2: Walls See-Through
The materials already have `side: THREE.DoubleSide`. Looking at the screenshot, the right structure shows walls as thin orange lines — the wall geometry itself renders but appears nearly invisible from certain angles. 

**Root cause**: The `GroundPlane` and `TerrainEnvironment3D` both render at `y = -0.01` with opaque green materials and `receiveShadow`. When walls are thin (0.15m) and viewed at shallow angles, depth buffer precision issues can make them blend with the ground. Additionally, the `Environment preset="night"` makes wall colors very dark and hard to distinguish.

**Fix**: 
- Add `depthWrite` and explicit `renderOrder` to ensure walls render on top of ground surfaces
- Walls in home view should use a slightly brighter default color to stand out against the dark environment

## Issue 3: Objects "Disappearing" Inside Rooms
The screenshot shows "Kunde inte ladda: KIVIK-4" errors — these are furniture models that failed to load (expired blob URLs). The objects aren't "disappearing" due to rendering — they literally fail to load. This was addressed in the previous plan's `Props3D.tsx` changes but the build error prevented those changes from taking effect.

The build error fix (issue 1) will unblock everything, and the Props3D blob URL restoration code should then work.

## File Changes

### 1. `src/components/build/BuildModeV2.tsx`
Remove the `import BuildBottomDock` line. Inline the dock component directly in this file (copy the ~70 lines from BuildBottomDock.tsx). This permanently eliminates the module resolution issue.

### 2. `src/components/build/Walls3D.tsx`
- Add `renderOrder={1}` to all wall mesh elements to ensure they render above the ground plane
- This ensures walls are never occluded by the ground plane due to depth precision issues

### 3. `src/components/build/InteractiveWalls3D.tsx`  
- Same `renderOrder={1}` fix for build mode walls

### 4. `src/components/build/GroundPlane.tsx`
- Add `renderOrder={0}` to explicitly render ground behind walls

