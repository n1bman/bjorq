

## Problem

The optimization pipeline doesn't actually work. Two root causes:

1. **`processModel` already downscales textures to 2048px during analysis**, mutating the scene in-place. By the time `optimizeModel` runs, textures are already modified. If the model's textures are ≤1024px (like the google_home_mini), there's nothing left to downscale.

2. **GLTFExporter produces larger output** than the original compressed GLB. The original file likely uses internal compression that's lost during re-export. Result: the "optimized" file is actually bigger (16.5 MB → 17.3 MB, 0% savings).

3. **UI nit**: The before/after table showing all 0% looks broken/useless to users.

## Fix

### `src/lib/assetPipeline.ts`

**A) Stop mutating textures in `processModel`**
- Remove the texture downscaling loop from `processModel` (lines 153-187). Only *analyze* textures (record max resolution), don't modify them.
- Remove `texturesDownscaled` from the return type — it's no longer needed since optimization is a separate step.
- Keep the `maxTextureRes` in stats for the recommendation UI.

**B) Have `optimizeModel` re-parse from the original file**
- Change signature: `optimizeModel(file: File, originalStats: AssetPerformanceStats, options?)` — takes the original `File`, not the already-processed scene.
- Re-parse the GLB from scratch using `GLTFLoader` to get a pristine scene with unmodified textures.
- Then apply: texture downscale (1024px), material dedup, scene cleanup, vertex strip.
- This ensures we're actually reducing from the original texture sizes, not from already-downscaled data.

**C) Show "no improvement" gracefully**
- If the optimized blob is larger than or equal to the original file size, return the original file's blob instead and flag `noImprovement: true` in the result.
- Add `noImprovement?: boolean` to `OptimizationResult`.

### `src/components/build/BuildModeV2.tsx`

**D) Pass `importFile` to `optimizeModel` instead of `importResult.scene`**
- Update `handleOptimize` to call `optimizeModel(importFile, importResult.stats)`.

**E) Handle "no improvement" in UI**
- If `optimizedResult.noImprovement`, show a message: "Modellen är redan optimerad — ingen ytterligare förbättring möjlig." with just an "Importera" button.
- Otherwise show the before/after table as now.

**F) Clean up the before/after display**
- Only show rows where there's an actual change (delta ≠ 0%), or always show all but highlight changed rows in green.

### Summary of what changes

| File | What |
|---|---|
| `assetPipeline.ts` | Stop mutating textures in `processModel`; re-parse from file in `optimizeModel`; detect no-improvement |
| `BuildModeV2.tsx` | Pass file to optimizer; handle no-improvement state in UI |

