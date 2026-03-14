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

## Preserved
- Wall painting workflow untouched
- Existing material preset IDs unchanged
- Save/load compatibility (new fields optional with fallbacks)
- Wall texture engine (C1 stylized walls)

## Väntar
- Real ambientCG texture file downloads (manual step)
- Per-wall roughness from finish selector
- Accent zones / backsplash
- Ceiling surfaces
- Custom user-uploaded floor textures
