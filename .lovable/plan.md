

# Fix: Build error + Remove wall view modes

## Build Error
Same Vite module resolution issue — `TerrainEnvironment3D` cannot be resolved. Since it's a small stub component (30 lines), we'll **inline it** into both `Scene3D.tsx` and `BuildScene3D.tsx`, removing the import.

## Remove Wall View Modes (Väggvisning)
The user suspects this feature causes wall visibility issues. We'll remove it entirely:

1. **`Walls3D.tsx`** — Remove all `wallViewMode` logic (`cutaway`, `down`, `room-focus`). Always render full walls. Remove the `effectiveMode` variable and all conditional filtering/height capping.

2. **`BuildTopToolbar.tsx`** — Remove the "Väggvisning" UI section (the 4 wall mode buttons).

3. **`store/types.ts`** — Remove `WallViewMode` type.

4. **`store/useAppStore.ts`** — Remove `wallViewMode` from the `build.view` default state.

5. **`Scene3D.tsx`** — Inline `TerrainEnvironment3D` component, remove the broken import.

6. **`BuildScene3D.tsx`** — Same inline fix for `TerrainEnvironment3D`.

This ensures walls are always fully visible and objects placed inside rooms won't be hidden by view mode logic.

