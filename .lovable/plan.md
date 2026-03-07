

# Build Mode Redesign — Architecture and UX Plan

## Current State Assessment

The Build Mode currently has:
- **1520-line Zustand store** with all state slices (layout, build, devices, props, environment, etc.)
- **1593-line BuildCanvas2D** monolith handling all 2D interaction (walls, rooms, openings, drag, zoom, touch)
- **962-line BuildInspector** with 6 sub-inspectors (wall, opening, room, prop, stair, device)
- **379-line InteractiveWalls3D** rendering walls with openings, materials, shadows
- **56px left sidebar** with 12+ small icon buttons crammed together
- **BuildCatalogStrip** (88 lines) showing presets for door/window/paint tools
- **Room detection** via graph-based minimal cycle algorithm
- **Undo/redo** via full state snapshots (layout + devices + props)

### Core Problems

1. **Left sidebar is too narrow** (56px) with too many tiny 44px buttons — poor for touch
2. **BuildCanvas2D is a 1593-line monolith** — hard to maintain, mixes drawing/interaction/rendering
3. **No bottom dock** — tools are vertical, not thumb-reachable on tablets
4. **Catalog strip only activates for 3 tools** (door, window, paint) — furnish, devices, import have no catalog
5. **Inspector always top-right** — not contextual
6. **BuildCatalogStrip.tsx causes recurring Vite resolution errors** — needs stable recreation

---

## Proposed Architecture

### 1. Editor Layout Structure

```text
Desktop:
+--------------------------------------------------+
| [Back] [Undo][Redo]    [2D|3D]  [Floor] [Done]   |  48px top bar
+--------------------------------------------------+
|                                                    |
|              CANVAS (2D or 3D)                     |
|                                      [Inspector]   |
|                                      (on select)   |
|                                                    |
+--------------------------------------------------+
| [Catalog Row - contextual, scrollable, ~100px]     |  hidden when inactive
+--------------------------------------------------+
| [Select][Wall][Room][Door][Window][Paint]...        |  56px bottom dock
+--------------------------------------------------+

Tablet/Phone (same, bottom dock is primary interaction zone):
- Bottom dock stays in thumb zone
- Catalog row slides up when tool needs options
- Inspector becomes a bottom sheet instead of top-right panel
```

### 2. Component Architecture

**Remove**: `BuildLeftPanel.tsx` as vertical sidebar
**Create**: `BuildBottomDock.tsx` — horizontal tool bar at bottom

```text
BuildModeV2
  +-- BuildTopToolbar (slim, 48px)
  +-- Canvas area (flex-1)
  |     +-- BuildCanvas2D or BuildScene3D
  |     +-- BuildInspector (floating or bottom-sheet)
  +-- BuildCatalogRow (conditional, above dock)
  +-- BuildBottomDock (fixed bottom, 56-64px)
```

**BuildBottomDock tools** (flattened, no categories):

| Tool | Icon | Catalog |
|------|------|---------|
| Select | MousePointer2 | none |
| Wall | Minus | none |
| Room | Square | none |
| Door | DoorOpen | door presets |
| Window | SquareStack | window presets |
| Stairs | Layers | none |
| Paint | Paintbrush | material swatches |
| Furnish | Sofa | furniture catalog |
| Devices | Lightbulb | device types |
| Import | Upload | import options |
| Erase | Trash2 | none |

Each button: min 48x48px, icon + 9px label below. Active tool highlighted with accent color + subtle glow.

**BuildCatalogRow** replaces both `BuildCatalogStrip` and `BuildTabBar`:
- Only visible when active tool has catalog content
- Height ~100px, horizontal scroll
- Content varies by tool:
  - **Door**: 4 door preset cards with dimensions
  - **Window**: 4 window preset cards
  - **Paint**: material swatches grouped by type (paint, wood, tile, concrete, metal)
  - **Furnish**: prop catalog thumbnails + upload button + search
  - **Devices**: device kind cards (light, switch, sensor, climate, camera, etc.)
  - **Import**: 3 cards (floor plan image, 3D model GLB, reference PDF)

### 3. Wall System Architecture

Current wall system is solid. Preserve:
- `WallSegment` with `from/to` coordinates, `openings[]`, `materialId`, `interiorMaterialId`
- Grid snapping via `snapToGrid()` in buildUtils
- Angle locking (Shift key, 45-degree increments)
- Node dragging with connected wall updates
- Auto-close polygon detection (< 0.3m to start node)

**Improvements needed**:
- Wall splitting on click (exists in store as `splitWall` but not in 2D canvas interaction)
- Visual feedback during wall drawing (length label, angle indicator) — partially exists
- Touch: long-press to select wall, drag to move node

### 4. Room Detection Logic

Current algorithm is good:
- Builds graph from wall endpoints with 5cm tolerance
- Finds minimal cycles using right-turn traversal
- Filters out tiny areas (< 0.5 m2)
- Preserves room metadata via polygon overlap matching (> 60%)
- Runs on explicit button press (RefreshCw button)

**Improvement**: Auto-detect rooms on wall change with debounce (300ms). The infrastructure for this exists in memory notes but isn't wired up in the current canvas code.

### 5. Undo/Redo Strategy

Current: full snapshot of `layout + devices + props` on each action. Stored in `undoStack[]` / `redoStack[]`.

This is simple and reliable. Keep it. The only improvement is:
- Cap stack size (currently unbounded — add max 50 entries)
- Push undo before every destructive action (already done consistently)

### 6. Object Placement System

**Openings (doors/windows/garage)**:
1. User taps Door/Window in bottom dock
2. Catalog row shows presets
3. User selects preset (or uses default)
4. User taps near a wall in 2D canvas
5. Opening placed at click offset along wall
6. Tool resets to Select, opening is selected for editing

**Furniture (props)**:
1. User taps Furnish in bottom dock
2. Catalog row shows catalog items + upload button
3. User taps item → prop placed at center of viewport
4. User drags to position, rotates via handle
5. Inspector shows position/rotation/scale controls

**Devices**:
1. User taps Devices in bottom dock
2. Catalog row shows device kinds (light, switch, sensor, etc.)
3. User taps device kind → placement mode activated
4. User taps in 3D/2D to place marker
5. Inspector shows HA entity picker, position controls

### 7. Device Integration Structure

Current system is comprehensive:
- `DeviceMarker` with `kind`, `position`, `rotation`, `ha.entityId`
- `DeviceState` union type covering 20+ device kinds
- HA bridge syncs live states from Home Assistant
- Devices render as 3D markers in scene
- Inspector allows linking to HA entities

**No changes needed** to the data model. The improvement is UX:
- Device catalog in the bottom catalog row (currently devices tab shows sub-tools in left sidebar)
- Better visual device cards with icons and labels

### 8. Material System

Current system supports:
- 20 preset materials (paint, wood, concrete, tile, metal)
- Custom materials via `addCustomMaterial()`
- Wall materials: exterior `materialId` + interior `interiorMaterialId`
- Room materials: `floorMaterialId` + `wallMaterialId`
- Custom texture upload (blob URL)

**Improvements**:
- Paint tool catalog row shows materials grouped by type with larger swatches
- Room inspector shows floor and wall material pickers
- Wall inspector shows interior/exterior toggle (already implemented)
- Texture upload button in catalog row (not just inspector)

### 9. Import Pipeline

Current import supports:
- 3D models: GLB/GLTF upload → blob URL → placed in scene
- Reference images: image/PDF upload → shown in 2D canvas as overlay
- Scale calibration: two-point measurement tool

**Improvements**:
- Import tool in bottom dock shows 3 cards in catalog row:
  1. "Planritning" (floor plan image/PDF as reference)
  2. "3D-modell" (GLB/GLTF import)
  3. "Referensbild" (background reference)
- Each card triggers the appropriate upload flow

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `BuildCatalogStrip.tsx` | **Delete + recreate as `BuildCatalogRow.tsx`** | Fix Vite resolution; comprehensive catalog for all tools |
| `BuildLeftPanel.tsx` | **Rewrite as `BuildBottomDock.tsx`** | Horizontal bottom toolbar, 48px buttons, labels |
| `BuildModeV2.tsx` | **Update layout** | flex-col: toolbar → canvas → catalog row → dock |
| `BuildTopToolbar.tsx` | **Simplify** | Remove wall view modes (move to floating 3D control) |
| `BuildInspector.tsx` | **Minor** | Add responsive bottom-sheet mode for mobile |

No changes to: `types.ts`, `useAppStore.ts`, `InteractiveWalls3D.tsx`, `BuildCanvas2D.tsx`, `roomDetection.ts`, `materials.ts`, `openingPresets.ts`, `buildUtils.ts`.

---

## Implementation Order

1. Fix build error (recreate catalog strip file)
2. Create `BuildBottomDock.tsx` (bottom tool bar)
3. Create `BuildCatalogRow.tsx` (contextual catalog for all tools)
4. Update `BuildModeV2.tsx` layout
5. Simplify `BuildTopToolbar.tsx`
6. Wire up catalog interactions (opening placement, device placement, furniture catalog)

