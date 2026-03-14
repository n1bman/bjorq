# Fasplan C — Stylized Surfaces, Floor Textures & Placement Foundation

## Fas C1 — Stylized Wall Surfaces ✅ DONE
- Walls render with color/roughness/metalness only — no image textures by default
- `applyMaterialTextures` accepts `context: 'wall' | 'floor'` and `forceTexture` flag
- Wall context skips texture loading; floor context continues as before
- All preset data (mapPath, normalMapPath, realWorldSize) preserved for future opt-in
- Face-aware editing preserved, save/load compatible

## Fas C2 — Floor Texture Defaults & Scaling ✅ DONE
- Floors3D passes per-room `floorSizeMode` to `applyFloorTextures`
- Added `floorSizeMode?: SurfaceSizeMode` to Room interface
- Floor materials apply `metalness` from presets
- All floor-appropriate presets verified with texture files

## Fas C3 — Surface Editor UX Cleanup ✅ DONE
- WallInspector simplified: shows paint + texture categories only (no tile/stone for walls)
- Added finish selector (Matt/Satin/Glans) for wall surfaces
- Larger touch targets (min-h-[36px] buttons, 8×8 swatches)
- Texture dot indicator only shown for floor target (walls are color-only)
- RoomInspector surface section updated with same touch improvements
- Uses `cn()` for consistent conditional class merging

## Fas C4 — Placement Rules Foundation ✅ DONE
- `checkWallCollision()` in placementEngine.ts — line-segment collision with push-out
- `findLandingPosition()` now applies wall barriers for non-free props
- Props3D drag handler wired through placement engine
- `freePlacement` flag added to PropItem interface
- "Fri placering" toggle in long-press quick menu (touch-first)
- Wall-mounted props skip floor drag (existing behavior preserved)
- `isWallMountable()` only triggers for placement='wall' or lighting/decor categories

## Väntar
- Custom textures as advanced opt-in → after C3
- Panels / accent zones / backsplash → after C4
- Ceiling surfaces → not in scope
- Material marketplace → not planned
- Advanced UV editing → not planned
- Per-wall roughness override from finish selector → future enhancement
