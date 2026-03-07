

# Build Mode Functional Quality Pass — Implementation Plan

## 1. Current State Analysis

### What Works
- **2D canvas**: Wall drawing, node dragging, wall dragging, room rectangles, opening placement (door/window click-to-wall), device placement, prop placement, measure tool, vacuum zone drawing, grid snap, angle lock, reference drawing overlay — all functional
- **3D scene**: Walls render with openings (doors/windows/garage), frames cast shadows, device markers are interactive, props load GLB models with drag support, floors render from room polygons
- **Bottom dock + catalog row**: Touch-friendly tools, visual opening presets, device catalog, material swatches — all wired up
- **Inspector**: Wall, opening, room, prop, stair, device inspectors — all functional
- **Store**: Complete actions for walls, rooms, openings, devices, props, undo/redo, materials

### What's Broken or Missing

| # | Issue | Type |
|---|-------|------|
| 1 | **Build error**: `BuildBottomDock.tsx` not found by Vite | Build |
| 2 | **3D selection incomplete**: Walls selectable via click, but openings/rooms/stairs not clickable in 3D. Props and devices ARE clickable. No visual highlight for openings in 3D. | Logic |
| 3 | **Wall corner overlap**: Walls are simple boxes that z-fight at corners where endpoints share a position — no mitering or corner cleanup | Visual/Geometry |
| 4 | **Import catalog row is a placeholder**: Import options show 3 cards but `onClick` is `() => {}` — not wired to any action | Logic |
| 5 | **Furnish catalog row is a placeholder**: Shows only an upload button with text, no catalog browsing or placement | Logic |
| 6 | **Garage door not in bottom dock**: Only door/window tools exist — no garage-door tool | UI gap |
| 7 | **Opening material picker missing**: Inspector shows wall interior/exterior materials but not per-opening materials | Logic |
| 8 | **Sunlight passes through doors/garage doors**: All openings are treated as transparent gaps — no light-blocking for solid panels | Visual |
| 9 | **Window styling basic**: Missing exterior sill depth, deeper frame profiles, Scandinavian proportions | Visual |
| 10 | **Robot vacuum features exist but catalog flow is incomplete**: VacuumMappingTools panel exists but only accessible via old left sidebar, not through new catalog row | UI wiring |

### UI-only vs Logic/Data Issues
- **UI-only**: #6 (add garage-door to dock), #10 (wire vacuum tools into catalog)
- **Logic gaps**: #2 (3D selection), #4 (import wiring), #5 (furnish catalog wiring), #7 (opening material)
- **Geometry/visual**: #3 (wall corners), #8 (light blocking), #9 (window styling)
- **Build error**: #1 (file missing)

## 2. Implementation Plan

### Phase 1: Fix Build + Critical Gaps (highest priority)

**1a. Fix build error — create `BuildBottomDock.tsx`**
The file exists on disk but Vite can't resolve it. Re-save with header comment.

**1b. 3D object selection for all types**
Currently `InteractiveWalls3D` handles wall selection via `onPointerDown`. Missing:
- **Openings**: Each opening's frame/panel meshes need `onPointerDown` to call `setSelection({ type: 'opening', id: op.id })`. Add click handlers to door frames, window frames, garage door panels in `InteractiveWalls3D.tsx`.
- **Rooms**: Floor meshes in `Floors3D.tsx` need `onPointerDown` to select room.
- **Props**: Already selectable via `Props3D.tsx` (line 98: `isSelected` check).
- **Devices**: Already selectable via `DeviceMarkers3D.tsx` (line 67: `handleClick`).
- **Visual highlight**: Add emissive glow to selected opening frames (same pattern as wall highlight). Add outline ring to selected room floor.

Files: `InteractiveWalls3D.tsx` (add click handlers per opening), `Floors3D.tsx` (add click handler per room mesh)

**1c. Wire import catalog actions**
The 3 import cards in `BuildCatalogRow.tsx` currently have `onClick: () => {}`. Wire them:
- "Planritning": trigger a hidden file input for image/PDF, call store's `setReferenceDrawing` (already in store as `setFloorplanImage`)
- "3D-modell": trigger file input for GLB/GLTF, reuse logic from `ImportTools.tsx` `handleUpload`
- "Referens": trigger file input for image, store as reference drawing

Files: `BuildCatalogRow.tsx` (add file inputs and handlers)

**1d. Wire furnish catalog to show existing catalog items**
Replace the placeholder upload-only UI with:
- Show existing `props.catalog` items as visual cards in the catalog row
- Each card click calls `addProp()` (same as `FurnishTools.handlePlaceFromCatalog`)
- Keep the upload button as the last card
- Add search input at the start of the row

Files: `BuildCatalogRow.tsx` (read `props.catalog` from store, render cards)

**1e. Add garage-door tool to bottom dock**
Add `{ tool: 'garage-door' as BuildTool, tab: 'structure', label: 'Garage', icon: Warehouse, hasCatalog: true }` to `dockItems`.
Add `'garage-door'` to `BuildTool` type.
Handle in `BuildCatalogRow` (same pattern as door/window).
Handle in `BuildCanvas2D` pointer handler (same as door/window placement).

Files: `types.ts`, `BuildBottomDock.tsx`, `BuildCatalogRow.tsx`, `BuildCanvas2D.tsx`

### Phase 2: Visual Quality

**2a. Wall corner mitering**
At shared endpoints, walls overlap as box geometries. Fix by shortening each wall box by half the connecting wall's thickness at shared nodes. Algorithm:
- For each wall, check if `from` or `to` matches another wall's endpoint (within 5cm)
- If connected, shorten the wall length by `connectedWall.thickness / 2` at that end
- This prevents z-fighting and creates clean L-joints and T-joints

Files: `InteractiveWalls3D.tsx` (adjust mesh length/position based on connected walls)

**2b. Light blocking for doors and garage doors**
Currently all openings leave a gap in the wall. For doors and garage doors, add an opaque panel that blocks the directional light shadow:
- Door panels already exist as meshes but don't have `castShadow`. Add `castShadow={true}` to door panel meshes.
- Garage door section panels (4 horizontal sections) — add `castShadow={true}`.
- Window glass should NOT cast shadow (it's transparent — keep as-is).

Files: `InteractiveWalls3D.tsx` (add `castShadow` to door/garage panel meshes)

**2c. Improved Scandinavian window styling**
Add deeper frame profile by increasing `frameDepth` from 0.06 to 0.10. Add:
- Exterior sill overhang: extend sill width by 0.12m and depth by 0.10m beyond wall face
- Thicker outer frame (0.05 instead of 0.04)
- Add an inner reveal/recess mesh (thin box at the opening edge, recessed into wall thickness)

Files: `InteractiveWalls3D.tsx` (enhance window rendering)

### Phase 3: Catalog & Device Completeness

**3a. Opening material customization**
Add `materialId` to `WallOpening` type (already exists in the interface at line 47). Wire it in `OpeningInspector`:
- Show a material picker section (reuse pattern from wall inspector)
- When material changes, update via `updateOpening()`
- Apply material color to door panels and window frames in `InteractiveWalls3D`

Files: `BuildInspector.tsx` (add material section to `OpeningInspector`), `InteractiveWalls3D.tsx` (read `op.materialId`)

**3b. Device subcategories in catalog row**
Group the 12 device kinds into logical subcategories:
- Ljus & El: light, switch, power-outlet
- Klimat: climate, fan, cover
- Säkerhet: camera, alarm, door-lock, sensor
- Media: media_screen, speaker, soundbar
- Robot: vacuum, lawn-mower

Show category tabs at the top of the device catalog row, then items below. Each item card should show an icon and label.

Files: `BuildCatalogRow.tsx` (add device subcategory grouping)

**3c. Vacuum and robot flow in catalog**
When vacuum device is selected in catalog, add sub-options:
- "Placera dammsugare" (place-vacuum)
- "Docka" (place-vacuum-dock)
- "Rita zon" (vacuum-zone)

These tools already exist in `BuildTool` and work in `BuildCanvas2D`. Just need to be exposed in the catalog row when the vacuum card is tapped.

Files: `BuildCatalogRow.tsx` (add vacuum sub-tools)

### Phase 4: Polish & Consistency

**4a. 3D opening placement**
When door/window/garage-door tool is active in 3D mode, clicking near a wall should place the opening (same logic as 2D). In `BuildScene3D.handleGroundPointerDown`, add:
- Find nearest wall to click point using `findWallAtWorld` from `buildUtils`
- Calculate offset `t` along wall
- Call `addOpening()`

Files: `BuildScene3D.tsx` (add opening placement logic)

**4b. 3D room floor click selection**
Already planned in Phase 1b via `Floors3D.tsx`.

**4c. Undo stack cap**
Add `undoStack.slice(-50)` in `pushUndo` to prevent unbounded growth.

Files: `useAppStore.ts` (cap stack in `pushUndo`)

---

## File Change Summary

| File | Phase | Changes |
|------|-------|---------|
| `BuildBottomDock.tsx` | 1a | Re-save to fix Vite resolution; add garage-door tool |
| `types.ts` | 1e | Add `'garage-door'` to `BuildTool` |
| `InteractiveWalls3D.tsx` | 1b, 2a, 2b, 2c, 3a | Opening click handlers, wall mitering, door castShadow, window styling, opening materials |
| `Floors3D.tsx` | 1b | Room floor click-to-select |
| `BuildCatalogRow.tsx` | 1c, 1d, 1e, 3b, 3c | Import wiring, furnish catalog, garage-door presets, device subcategories, vacuum sub-tools |
| `BuildCanvas2D.tsx` | 1e | Garage-door placement handler |
| `BuildScene3D.tsx` | 4a | 3D opening placement |
| `BuildInspector.tsx` | 3a | Opening material picker |
| `useAppStore.ts` | 4c | Undo stack cap |

## Priority Order

1. Fix build error (Phase 1a) — **blocks everything**
2. 3D selection (Phase 1b) — **highest user priority**
3. Import + furnish wiring (Phase 1c, 1d) — **critical functional gaps**
4. Garage-door tool (Phase 1e) — **missing feature**
5. Wall corners + light blocking (Phase 2a, 2b) — **visual quality**
6. Window styling (Phase 2c) — **visual quality**
7. Opening materials + device subcategories (Phase 3) — **completeness**
8. 3D opening placement + undo cap (Phase 4) — **polish**

