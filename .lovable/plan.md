# Floor Material Experience Improvement

## Phase F1 — Floor Selection Highlight Fix ✅ DONE
- Replaced solid blue fill with perimeter-only outline (`<line>` geometry)
- Textures always applied regardless of selection state
- Subtle emissive tint (0.08) keeps glow without hiding material
- File: `src/components/build/Floors3D.tsx`

## Phase F2 — Floor Material Browser UI ✅ DONE
- Floor target shows larger material cards (grid-cols-3) with texture thumbnails
- Category-first tabs: Trä & Parkett, Kakel & Klinker, Sten & Betong, Textur, Matta
- Material name visible below each card
- Wall target unchanged (small swatches)
- File: `src/components/build/structure/PaintTool.tsx`

## Phase F3 — Curated Floor Texture Pack ✅ DONE
- 25 new floor-only presets across 5 categories (Wood, Tile, Stone, Texture, Carpet)
- `floorOnly` flag added to Material interface
- Paths under `public/textures/floor/` — falls back to flat color if files missing
- ambientCG (CC0) as documented source for future file placement
- File: `src/lib/materials.ts`, `src/store/types.ts`

## Phase F4 — Floor Texture Mapping Polish ✅ DONE
- Aspect-ratio clamping in `calculateRepeat` prevents extreme stretching
- `floorSizeMode` UI control (Auto/Small/Standard/Large) added to floor material browser
- All new presets have sensible `realWorldSize` values
- File: `src/lib/materials.ts`, `src/components/build/structure/PaintTool.tsx`

## Phase F5 — ambientCG Thumbnails + Size Mode Fix ✅ DONE
- Added `thumbnailUrl` and `ambientCGId` fields to Material interface
- All 25 floor presets mapped to specific ambientCG assets with CDN thumbnails
- PaintTool shows CDN thumbnails with category emoji badges (🪵🔲🪨✦🧶)
- Hybrid approach: CDN thumbnail for browser preview, local files for 3D textures
- Fixed `Floors3D.tsx` memoization — `floorSizeMode` changes now trigger re-render
- Thumbnail URL pattern: `https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-JPG-FFFFFF/{AssetId}.jpg`

## Preserved
- Wall painting workflow untouched
- Existing material preset IDs unchanged
- Save/load compatibility (new fields optional with fallbacks)
- Wall texture engine (C1 stylized walls)

## Phase F6 — Manual Scale & Rotation Sliders ✅ DONE
- Added `floorTextureScale` (0.2–4.0x) and `floorTextureRotation` (0°–360°) per room
- Two sliders under size mode presets in Måla panel with live value display
- Texture engine clones textures per room to avoid cross-room leaking
- Rotation applied via `tex.rotation` + `tex.center` for proper pivot
- Undo pushed once per drag (mouseDown/touchStart), not per tick
- Files: `types.ts`, `BuildModeV2.tsx`, `wallTextureLoader.ts`, `Floors3D.tsx`

## Väntar
- Real ambientCG 1K texture file downloads (manual step — download ZIPs from ambientcg.com/get?file={ID}_1K-JPG.zip)
- Per-wall roughness from finish selector
- Accent zones / backsplash
- Ceiling surfaces
- Custom user-uploaded floor textures
