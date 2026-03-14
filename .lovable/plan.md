

# Fix Stretched Floor Textures + Increase Scale Range

## Problem
The floor textures look stretched because the `realWorldSize` values are **non-square** (e.g. `[0.20, 1.2]` for wood planks) but the actual texture images from ambientCG CDN are **square** (1:1 aspect ratio). This creates uneven UV tiling — 25 repeats on X but only 2.5 on Y — stretching the square image into a rectangle.

## Fix

### 1. Square `realWorldSize` for all CDN-based floor presets
The ambientCG 2048px thumbnails are square photos. The `realWorldSize` must match the image's aspect ratio. Change all 25 floor presets to use **square** `realWorldSize` values (e.g. `[1.0, 1.0]` for wood, `[0.6, 0.6]` for tile, etc.). This makes the texture tile as uniform squares across the floor — no stretching.

**File**: `src/lib/materials.ts` — update `realWorldSize` on all `floorOnly` presets.

### 2. Increase scale slider max from 4.0 to 10.0
Gives more room to zoom in on the pattern. The slider in `BuildModeV2.tsx` currently caps at `4.0` — change to `10.0`.

**File**: `src/components/build/BuildModeV2.tsx`

### What stays the same
- Rotation slider unchanged
- Wall materials unchanged  
- Size mode presets (Auto/Liten/Standard/Stor) unchanged
- Undo behavior unchanged

