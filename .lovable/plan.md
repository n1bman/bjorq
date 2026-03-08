

## Problem

The optimization "works" technically but produces no actual improvement for this model (16.5 MB google_home_mini). Root cause: **GLTFExporter re-encodes textures as uncompressed PNG**, which is often *larger* than the original JPEG-compressed textures inside the GLB. Since the model's textures are already ≤1024px, downscaling does nothing, and re-export bloats the file.

Additionally, the thumbnail is missing/blank in the "already optimized" view (second screenshot).

## Fix

### 1. Force JPEG encoding for non-transparent textures before export (`assetPipeline.ts`)

The key insight: GLTFExporter takes canvas elements as texture sources and encodes them as PNG by default. We need to **pre-convert texture canvases to JPEG data** before export.

After all texture processing, for each texture where the material is non-transparent and the map is a diffuse/roughness/metalness/AO/emissive map (not normal maps which need precision):
- Render the texture to a canvas
- Convert to JPEG via `canvas.toDataURL('image/jpeg', 0.85)`
- Create an `Image` from that data URL and assign it back to `tex.image`

This forces GLTFExporter to embed JPEG data (~5-10x smaller than PNG for photo textures).

**Even for textures that don't need downscaling** (already ≤1024px), we should still re-encode them as JPEG to reduce GLB size. This is the main missing piece.

### 2. Always render textures to canvas (`assetPipeline.ts`)

Update `optimizeModel` to ensure all textures pass through a canvas (even if not downscaled), so we can control the output format. Add a new step between downscaling and export:

```text
For each texture:
  1. If larger than maxRes → downscale (existing)
  2. If diffuse/roughness/metalness/AO/emissive on non-transparent material:
     → re-encode canvas as JPEG (quality 0.85)
  3. Normal maps → keep as PNG (canvas, no JPEG)
```

### 3. Fix blank thumbnail in optimized view

The thumbnail might fail because the re-parsed scene doesn't have proper bounding box after cleanup. Ensure `generateThumbnail` is called with a fresh `Box3` computed from the final optimized scene, and handle the case where thumbnail generation returns empty string.

### File changes

**`src/lib/assetPipeline.ts`**:
- Add helper `reencodeTextureAsJPEG(tex, quality)` that renders any texture image to a canvas and converts to JPEG data URL, then loads it back as an HTMLImageElement on `tex.image`
- In `optimizeModel`, after downscaling loop, add a second pass: for all non-normal-map textures on non-transparent materials, call `reencodeTextureAsJPEG`
- For textures that weren't downscaled (already ≤1024), still run them through the JPEG re-encode pass — this is where the real savings come from
- Fix thumbnail: recompute bounding box from the optimized scene before generating thumbnail

**`src/components/build/BuildModeV2.tsx`**:
- Show original thumbnail as fallback when optimized thumbnail is empty
- No other UI changes needed — the before/after table and noImprovement logic are correct

### Expected result

For the google_home_mini (16.5 MB, 1024px textures):
- Textures re-encoded as JPEG → significant file size reduction (likely 60-80%)
- Material dedup + cleanup still applies
- `noImprovement` flag should NOT trigger since JPEG re-encoding will produce a smaller file

