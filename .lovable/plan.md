# Fasplan C — Stylized Surfaces, Floor Textures & Placement Foundation

## Fas C1 — Stylized Wall Surfaces ✅ DONE
- Walls render with color/roughness/metalness only — no image textures by default
- `applyMaterialTextures` accepts `context: 'wall' | 'floor'` and `forceTexture` flag
- Wall context skips texture loading; floor context continues as before
- All preset data (mapPath, normalMapPath, realWorldSize) preserved for future opt-in
- Face-aware editing preserved, save/load compatible

## Fas C2 — Floor Texture Defaults & Scaling ✅ DONE
- Floors3D now passes per-room `floorSizeMode` to `applyFloorTextures`
- Added `floorSizeMode?: SurfaceSizeMode` to Room interface
- Floor materials now apply `metalness` from presets (polished concrete, etc.)
- Texture files verified for wood (oak/walnut/pine/herringbone), tile (subway/white/dark/marble), stone (concrete/limestone/slate/polished), texture (stucco/venetian/limewash/microcement)
- Presets without texture files (ash, birch, cedar, sandstone, clay) fall back to flat color gracefully

## Fas C3 — Surface Editor UX Cleanup
- Inspector: surface style first, technical dimensions last
- Wall material browsing → color palettes + finish (matt/satin/glans)
- Floor keeps category-based texture browsing
- sizeMode selector visible only for floors
- Touch-friendly hit targets

## Fas C4 — Placement Rules Foundation
- Wall collision barriers for normal furniture
- Wall-mount only for `wallMount: true` objects
- "Fri placering" in long-press menu (touch-first)
- No keyboard modifier as primary solution

## Väntar
- Custom textures as advanced opt-in → after C3
- Panels / accent zones / backsplash → after C4
- Ceiling surfaces → not in scope
- Material marketplace → not planned
- Advanced UV editing → not planned
