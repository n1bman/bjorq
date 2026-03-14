

# Fix Floor Textures: Real ambientCG Thumbnails + Working Size Mode

## Problems Identified

1. **All 25 floor texture files are missing** — every `mapPath` under `/textures/floor/` returns 404. The 3D view falls back to flat color, making size mode changes invisible.
2. **No visual difference between materials** in the browser — all cards show flat color swatches because thumbnail images don't exist locally either.
3. **Size mode (Auto/Liten/Standard/Stor)** appears to do nothing because there's no texture to scale.

## Solution

### 1. Add ambientCG Asset Mapping + CDN Thumbnails

Add a `thumbnailUrl` and `ambientCGId` field to each of the 25 floor presets pointing to ambientCG's public preview images. These will be used in the material browser UI for visual identification.

Example mapping:
- `floor-light-oak` → `WoodFloor051` (light oak plank)
- `floor-dark-walnut` → `WoodFloor040` (dark walnut)
- `floor-herringbone` (existing) → `WoodFloor048` (herringbone parquet)
- `floor-porcelain-large` → `Tiles074` (large format)
- `floor-terracotta` → `Tiles131` (terracotta)
- etc. (all 25 mapped to specific real ambientCG assets)

Thumbnail URL pattern: `https://acg-media.struffelproductions.com/file/ambientCG-Web/media/sphere/256-JPG-TONEMAPPED/{AssetId}.jpg`

**Files**: `src/lib/materials.ts`, `src/store/types.ts` (add `thumbnailUrl?: string`, `ambientCGId?: string`)

### 2. Update Material Browser to Show Real Thumbnails

Update PaintTool floor cards to:
- Show the ambientCG CDN thumbnail as the card image (with color fallback)
- Add a small category badge/icon overlay (wood grain icon, tile icon, etc.)
- Make cards slightly larger for better visual clarity

**Files**: `src/components/build/structure/PaintTool.tsx`

### 3. Fix Size Mode Reactivity

The `floorSizeMode` is stored correctly but `Floors3D.tsx` memoization doesn't include `floorSizeMode` as a dependency — texture repeat values are baked at first render and never update. Fix by including room's `floorSizeMode` in the `useMemo` deps.

**Files**: `src/components/build/Floors3D.tsx`

### 4. Provide Download Guide for Actual 3D Textures

Since ambientCG textures are in ZIP downloads (not direct-linkable for Three.js CORS), create a small helper doc/comment listing the exact download links for each asset. The user drops 1K-JPG files into `public/textures/floor/` and they work immediately.

Until the real files are placed, the 3D floor will show the flat color from the preset (existing fallback behavior), but the material browser will show real ambientCG thumbnails so you can identify and select materials visually.

## What's Preserved

- All existing material presets and IDs
- Wall painting workflow (unchanged)
- Per-room material assignment and undo system
- Local-first architecture (thumbnails are CDN-cached, textures are local files)

## Implementation Order

1. Add `thumbnailUrl` + `ambientCGId` to types and all 25 floor presets
2. Update PaintTool to render CDN thumbnails with category badges
3. Fix Floors3D memoization for size mode reactivity
4. Add download guide comments in materials.ts

