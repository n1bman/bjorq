

# Fix 2D/3D Camera Sync for Import Overlay

## Problem
The 3D orthographic camera in `ImportPreview3D.tsx` uses `baseFactor = 2`, halving the zoom relative to the 2D canvas. This means the 3D model appears at a different scale/position than the 2D grid and walls drawn on top. The 2D canvas `zoom` is in pixels-per-meter, which directly equals the orthographic camera's `zoom` property (pixels per world unit).

## Fix

### `src/components/build/ImportPreview3D.tsx`
- Change `baseFactor` from `2` to `1` so `camera.zoom = sync.zoom` matches the 2D canvas exactly.
- The offset values (`sync.offsetX`, `sync.offsetY`) are already in world-space meters, matching `camera.position.x/z` — these are correct.

Single line change:
```typescript
// Line 15: const baseFactor = 2;
const baseFactor = 1;
```

This aligns the orthographic camera's field of view exactly with the 2D canvas coordinate system, so the imported 3D model and the 2D walls/grid overlay are pixel-perfect synced.

