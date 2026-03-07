

## Sims 4-inspired Build Mode Overhaul

### Problems to Fix

1. **Build error**: `BuildCatalogStrip.tsx` exists but Vite can't resolve it (same caching issue as before)
2. **Dark floor**: Default room floor color is `#2a2d35` (near-black) and ground plane is `#1a1d23` at 60% opacity — both too dark
3. **Window shadows**: Glass panels use `meshStandardMaterial` with transparency but no frame `castShadow` — frames don't cast shadows, light passes through as a plain rectangle
4. **Spam-placing openings**: After adding a door/window via wall inspector, tool doesn't reset — user can keep clicking to add more
5. **No visual preset picker before placing**: User wants to pick a door/window style visually in the catalog strip BEFORE clicking a wall, like Sims 4
6. **No interior/exterior wall materials**: `WallSegment` only has one `materialId` — no separation between inside and outside face
7. **No custom texture upload for walls**: Material system supports `textureUrl` in the type but there's no UI to upload/apply textures to walls

### Plan

**1. Fix build error** — Re-save `BuildCatalogStrip.tsx` with a comment header to force Vite resolution.

**2. Fix dark floors** — Change default floor color from `#2a2d35` to `#d4c5a9` (warm light wood) in `Floors3D.tsx`. Change `GroundPlane` color from `#1a1d23` to `#3a5a2a` (dark grass green) at full opacity.

**3. Fix window frame shadows** — Add `castShadow` to all window/door frame meshes in `InteractiveWalls3D.tsx`. The glass panel already has transparency so light passes through correctly, but the frame bars (top, bottom, left, right, mullion, sill) need `castShadow={true}` to project their silhouette.

**4. Auto-deselect after placing openings** — In `WallInspector` (`BuildInspector.tsx`), after `addOpening()` is called, automatically select the new opening (`setSelection({ type: 'opening', id: newId })`). This prevents mindless spam-clicking from creating duplicates because the user is now in "edit opening" mode, not "add opening" mode.

**5. Visual opening picker in catalog strip** — When the user selects `door`, `window`, or `garage-door` tool from the left panel, the `BuildCatalogStrip` shows visual preset cards (not just text buttons). Each card shows:
  - An icon/visual representation
  - The preset name and dimensions
  - Click to select the preset, then click on a wall in 2D/3D to place it

This requires:
- Adding `door`, `window`, `garage-door` as build tools in the left panel (structure category)
- Updating `BuildCatalogStrip` to show opening presets when these tools are active
- Updating `BuildCanvas2D` click handler: when tool is `door`/`window`/`garage-door` and user clicks near a wall, place the selected preset opening on that wall
- Auto-deselect to `select` tool after placement (existing pattern from device placement)

**6. Interior/exterior wall materials** — Extend `WallSegment` type:
```typescript
interface WallSegment {
  // existing fields...
  materialId?: string;        // kept for backward compat (exterior)
  interiorMaterialId?: string; // NEW: inside face material
}
```
Update `InteractiveWalls3D.tsx` to render walls as two thin planes (interior + exterior face) instead of a single box when different materials are set. Update wall inspector to show two material pickers: "Utsida" and "Insida".

**7. Custom texture upload for walls** — Add a texture upload button in the wall inspector's material section. When uploaded, create a custom material entry and apply it. Use the existing `textureUrl` field on the `Material` type.

**8. Click-to-edit popups** — When clicking a wall/opening/room in 3D view, show the inspector as a popup near the click position rather than always top-right. This is more Sims-like (contextual editing).

### Files Changed

| File | Action |
|------|--------|
| `src/components/build/BuildCatalogStrip.tsx` | Re-save + add visual opening preset cards |
| `src/components/build/Floors3D.tsx` | Fix default floor color to light wood |
| `src/components/build/GroundPlane.tsx` | Fix ground color to grass green |
| `src/components/build/InteractiveWalls3D.tsx` | Add castShadow to frames, support interior/exterior materials |
| `src/components/build/BuildInspector.tsx` | Auto-select opening after add, add interior/exterior material pickers, texture upload |
| `src/components/build/BuildLeftPanel.tsx` | Add door/window/garage-door tool buttons |
| `src/components/build/BuildCanvas2D.tsx` | Handle click-to-place openings when door/window tool active |
| `src/store/types.ts` | Add `interiorMaterialId` to WallSegment, add door/window/garage-door to BuildTool |
| `src/store/useAppStore.ts` | Add selected opening preset state, handle placement |

### Technical Details

- Interior/exterior rendering: When both materials differ, split the box into two planes offset by ±thickness/2 along the wall normal. When same or only one set, keep single box for performance.
- Opening placement flow: Select tool → catalog shows presets → click wall in 2D → opening placed at click position offset → tool resets to `select`
- Frame shadows: Simply add `castShadow` prop to existing frame `<mesh>` elements — no geometry changes needed
- Custom textures: Use `URL.createObjectURL()` for uploaded images, store as blob URL in material's `textureUrl`, apply via `TextureLoader` in 3D

