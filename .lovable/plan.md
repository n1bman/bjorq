

# Floor Material Experience Improvement — Phase Plan

## Current State

- **Floor selection highlight**: Solid blue fill (`#4a9eff`) with emissive glow completely hides the applied material texture
- **Material browser**: Tiny 24x24px color swatches — identical for walls and floors. No texture previews, no visual identity for floor materials
- **Texture pack**: ~15 textures exist locally (wood, tile, stone, texture categories). Many presets reference missing files (no normal maps for oak/walnut/pine, no carpet category at all)
- **Auto-scaling**: Working via `calculateRepeat()` + `realWorldSize`, but only ~60% of floor presets have textures wired

---

## Phase F1 — Floor Selection Highlight Fix

**Problem**: `Floors3D.tsx` line 57 sets `color: isSelected ? '#4a9eff' : color` and line 69 skips texture application when selected (`if (mat && !isSelected)`).

**Change**: Replace solid blue fill with a perimeter-only indicator:
- Always apply the real material color + texture regardless of selection
- Add a separate `<lineLoop>` mesh rendered from the room polygon as a bright outline (e.g. `#4a9eff`, linewidth via `LineBasicMaterial`)
- Add subtle emissive tint (very low intensity ~0.1) so the floor has a faint glow but the texture remains fully visible
- Remove the `!isSelected` guard on `applyFloorTextures`

**Files**: `src/components/build/Floors3D.tsx`

---

## Phase F2 — Floor Material Browser UI

**Problem**: Floor materials use the same tiny swatch grid as wall paint. Texture/pattern identity is invisible.

**Change**: When `target === 'floor'` in PaintTool, render a different layout:
- **Category-first tabs** with floor-specific labels: Trä, Parkett, Kakel, Sten & Betong, Textur, Matta
- **Larger material cards** (~48x48px or 56x36px) showing the actual `mapPath` texture as a thumbnail `<img>` with the color as fallback background
- Material name visible below each card
- Active material gets a primary border ring
- Keep per-room application pattern (room name → material grid below)
- Wall target remains unchanged (small swatches are fine for paint)

**Files**: `src/components/build/structure/PaintTool.tsx`

---

## Phase F3 — Curated ambientCG Floor Texture Pack

**Problem**: Many floor presets lack actual texture files. No carpet/fabric category exists.

**Change**: Add 25 curated floor textures (5 per category) as placeholder-ready presets. Since we cannot download real ambientCG images at build time in this environment, we will:
1. Add all 25 material presets to `materials.ts` with correct `mapPath`, `realWorldSize`, `roughness`, `metalness` values
2. Organize paths under `public/textures/floor/` with subdirectories: `wood/`, `tile/`, `stone/`, `texture/`, `carpet/`
3. Create simple procedural placeholder textures (solid color with subtle noise pattern via canvas-generated data URLs at startup) as fallback until real ambientCG files are dropped in
4. Document which ambientCG asset IDs to download for each slot

**Categories & presets**:
- **Wood** (5): Light Oak Plank, Dark Walnut Plank, Ash Whitewash, Smoked Oak, Bamboo
- **Tile** (5): Large Format Porcelain, Terracotta, Hexagon Cement, Checkerboard, Slate Tile  
- **Stone/Concrete** (5): Polished Concrete, Raw Concrete, Travertine, Granite, Microcement
- **Texture/Plaster** (5): Tadelakt, Epoxy Resin, Cork, Vinyl Plank, Linoleum
- **Carpet/Fabric** (5): Loop Pile Grey, Cut Pile Beige, Sisal Natural, Berber Cream, Wool Charcoal

Each preset gets: `id`, `name`, `color`, `roughness`, `metalness`, `realWorldSize`, `surfaceCategory`, `hasTexture`, `mapPath`, `floorOnly: true` flag

**Files**: `src/lib/materials.ts`, `src/store/types.ts` (add `floorOnly?: boolean` to Material), new `public/textures/floor/` structure

---

## Phase F4 — Floor Texture Mapping Polish

**Problem**: Current auto-scaling works but some edge cases produce stretched or overly tiled results.

**Change**:
- Ensure all new floor presets have sensible `realWorldSize` values (e.g. plank wood: `[0.20, 1.2]`, large tile: `[0.60, 0.60]`, carpet: `[2.0, 2.0]`)
- In `applyFloorTextures`, add aspect-ratio awareness: if the floor is very elongated, adjust repeat to avoid extreme stretching on one axis
- Verify `calculateRepeat` produces correct values for each new preset
- Add `floorSizeMode` control in the floor material browser UI (Auto/Small/Standard/Large buttons below the material grid)

**Files**: `src/lib/wallTextureLoader.ts`, `src/lib/materials.ts`, `src/components/build/structure/PaintTool.tsx`

---

## What Is Preserved

- Wall painting workflow (small swatches, color-first, finish selector) — untouched
- Existing material presets and their IDs — no removals or renames
- `setRoomMaterial` store action, undo system, per-room material assignment
- Wall texture engine (C1 stylized walls, B4/B5 infrastructure)
- Save/load compatibility — new fields are optional with fallbacks

## What Waits Until Later

- Real ambientCG texture file downloads (manual step — documented)
- Per-wall roughness from finish selector
- Accent zones / backsplash
- Ceiling surfaces
- Custom user-uploaded floor textures
- Material marketplace

---

## Implementation Order

F1 → F2 → F3 → F4 (each phase is independently useful and safe to ship)

