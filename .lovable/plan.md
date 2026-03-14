

# Fix Floor Textures, Add Download Guide, Room Dropdown

## Three Issues

### 1. Size mode doesn't visually change anything
**Root cause**: All 25 floor texture files (e.g. `/textures/floor/wood/light_oak_diff.jpg`) return 404. The `calculateRepeat` logic works correctly, but there's no texture to scale — only flat color shows. Additionally, `THREE.TextureLoader` doesn't have `crossOrigin` set, so even CDN URLs would fail.

**Fix**:
- Set `mapPath` on all 25 floor presets to the ambientCG CDN URL (the 2048px flat thumbnail which is a tileable preview): `https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/2048-JPG-FFFFFF/{ambientCGId}.jpg`
- Add `textureLoader.setCrossOrigin('anonymous')` in `wallTextureLoader.ts`
- Widen size mode multipliers for more visible effect: `small: 0.4, standard: 1.0, large: 2.5` (currently 0.6/1.0/1.6 — too subtle)

**Files**: `src/lib/materials.ts`, `src/lib/wallTextureLoader.ts`

### 2. Missing texture download guide
Create `public/textures/guide/README.md` listing all 25 assets with:
- ambientCG asset name and ID
- Direct download link for 1K-JPG ZIP
- Which file to extract (e.g. `WoodFloor051_1K-JPG/WoodFloor051_1K_Color.jpg`)
- Where to place it locally (optional override path)

**Files**: new `public/textures/guide/README.md`

### 3. Room list should be a dropdown, not all visible
Currently all rooms are listed vertically with their full material grids, causing heavy scrolling. Replace with:
- A `<select>` dropdown to pick the active room
- Only show the material grid for the selected room
- Default to first room

**Files**: `src/components/build/BuildModeV2.tsx` (SurfaceEditor function, lines ~1430-1513)

## What's Preserved
- All existing material IDs and presets
- Wall painting workflow unchanged
- Undo system and per-room assignment
- Outline selection highlight (F1)

