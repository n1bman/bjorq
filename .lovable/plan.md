

# Build Mode v2 -- Complete Rebuild

## Overview
Complete rebuild of Build Mode into a Sims/Vivaland-inspired building experience with 3 tabs (Structure, Home Import, Furnish), a top-down plan view as primary editing surface, a live 3D preview toggle, HomeGeometry layer, props catalog, and touch-first UI.

---

## Architecture: State Redesign

### New/Modified Types (`src/store/types.ts`)

**BuildTool** expanded:
```
'select' | 'wall' | 'room' | 'door' | 'window' | 'stairs' | 'paint' | 'template' | 'erase' | 'copy' | 'measure'
```

**BuildTab**: `'structure' | 'import' | 'furnish'`

**SnapMode**: `'strict' | 'soft' | 'off'`

**CameraMode**: `'topdown' | '3d' | 'floor-isolate'`

**New BuildState**:
- `tab: BuildTab`
- `tool: BuildTool`
- `grid: { enabled: boolean; sizeMeters: number; snapMode: SnapMode }`
- `selection: { type: 'wall' | 'opening' | 'room' | 'prop' | 'stair' | null; id: string | null }`
- `view: { cameraMode: CameraMode; showOtherFloorsGhost: boolean; floorFilter: string | 'all' }`
- `wallDrawing: { isDrawing: boolean; nodes: [number, number][] }`
- `roomDrawing: { isDrawing: boolean; startPoint: [number, number] | null; endPoint: [number, number] | null }`
- `undoStack / redoStack` (snapshot-based)
- `calibration` (same as current)

**New HomeGeometry layer**:
```typescript
interface HomeGeometryState {
  source: 'procedural' | 'imported';
  imported: {
    url: string | null;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    groundLevelY: number;
    northAngle: number;
    floorBands: { id: string; name: string; minY: number; maxY: number }[];
  };
}
```

**WallOpening** gets `sillHeight` field for windows.

**New StairItem**:
```typescript
interface StairItem {
  id: string;
  floorId: string;
  position: [number, number];
  rotation: number;
  width: number;
  length: number;
  fromFloorId: string;
  toFloorId: string;
}
```

**Floor** gets `heightMeters: number` (wall height default for that floor).

**PropsState** split into:
- `catalog: PropCatalogItem[]` (asset library with source: 'builtin' | 'user')
- `items: PropItem[]` (placed instances referencing catalog)

**RoomTemplate type**:
```typescript
interface RoomTemplate {
  id: string;
  name: string;
  width: number;
  depth: number;
  category: 'bedroom' | 'kitchen' | 'livingroom' | 'bathroom';
}
```

### Store actions added:
- `setBuildTab(tab)`
- `setGrid(partial)` / `setSnapMode` / `toggleGrid`
- `setCameraMode(mode)`
- `setSelection(sel)`
- `addStair / removeStair`
- `setHomeGeometrySource(source)`
- `setImportedModel(settings)`
- `addFloorBand / removeFloorBand / updateFloorBand`
- `setNorthAngle(angle)`
- `addToCatalog(item) / removeFromCatalog(id)`
- `splitWall(floorId, wallId, point)` -- split wall at a point
- `addRoomFromRect(floorId, x, z, w, d, name)` -- creates 4 walls + room

---

## Component Architecture

### Files to DELETE (replaced):
- `src/components/build/Canvas2D.tsx` (replaced by new BuildCanvas2D)
- `src/components/build/BuildScene3D.tsx` (replaced by new BuildScene3D)
- `src/components/build/BuildPreview3D.tsx` (no longer needed)
- `src/components/build/Walls3D.tsx` (replaced by new ProceduralShell3D)

### Files to CREATE:

**Core layout:**
- `src/components/build/BuildModeV2.tsx` -- main layout: full-screen canvas + floating overlays
- `src/components/build/BuildTopToolbar.tsx` -- always-visible top bar (select, copy, erase, undo/redo, grid controls, view toggle, floor picker)
- `src/components/build/BuildTabBar.tsx` -- tab selector: Structure | Import | Furnish
- `src/components/build/BuildLeftPanel.tsx` -- contextual left tool panel (tools change per tab)
- `src/components/build/BuildInspector.tsx` -- right/bottom inspector for selected object properties

**2D Plan View (primary editing surface):**
- `src/components/build/BuildCanvas2D.tsx` -- new HTML Canvas top-down view with:
  - Grid rendering (configurable size)
  - Wall drawing (click nodes, double-click finish)
  - Room rectangle drag tool
  - Opening placement on walls (click wall to place door/window)
  - Stair placement
  - Template stamp placement
  - Node dragging, wall dragging, wall splitting
  - Erase tool (click to delete)
  - Copy/eyedropper tool
  - Measure tool
  - Floorplan image background + calibration
  - Room polygon fills with material colors
  - Ghost of other floors (semi-transparent)
  - Touch support (1-finger drag, 2-finger pinch/pan)

**3D Preview (toggle):**
- `src/components/build/BuildScene3D.tsx` -- R3F Canvas with:
  - ProceduralShell3D (walls + floors from layout) when source=procedural
  - ImportedHome3D (loaded GLB) when source=imported
  - Props3D (placed props from catalog)
  - Camera presets (top-down ortho, dollhouse, floor isolate)
  - Environment lighting using environment store
- `src/components/build/ProceduralShell3D.tsx` -- generates wall meshes + floor meshes from layout (replaces Walls3D + Floors3D)
- `src/components/build/ImportedHome3D.tsx` -- loads and renders imported GLB with transform controls
- `src/components/build/Props3D.tsx` -- renders placed prop instances

**Tab-specific panels:**
- `src/components/build/structure/StructureTools.tsx` -- wall, room, door, window, stairs, paint, templates, measure buttons
- `src/components/build/structure/TemplatesPicker.tsx` -- room preset cards (Bedroom, Kitchen, etc.)
- `src/components/build/structure/PaintTool.tsx` -- simple color picker for wall/floor per room

- `src/components/build/import/ImportTools.tsx` -- upload, place/align, scale calibration, north alignment, floor bands
- `src/components/build/import/ScaleCalibrationImport.tsx` -- two-point measurement on imported model
- `src/components/build/import/NorthAlignment.tsx` -- compass overlay / rotation control
- `src/components/build/import/FloorBandsEditor.tsx` -- define minY/maxY bands

- `src/components/build/furnish/FurnishTools.tsx` -- My Models catalog, import, place/move/rotate controls
- `src/components/build/furnish/PropsCatalog.tsx` -- grid of catalog items with import button

**Shared:**
- `src/components/build/FloorPicker.tsx` -- replaces FloorManager, horizontal floor selector (Alla / Vaning 1 / ...)
- `src/lib/roomTemplates.ts` -- built-in room template definitions

### Files to MODIFY:
- `src/store/types.ts` -- all type changes above
- `src/store/useAppStore.ts` -- all new actions + homeGeometry state
- `src/pages/Index.tsx` -- swap `BuildMode` for `BuildModeV2`
- `src/components/build/BuildMode.tsx` -- can be kept as redirect or deleted

### Files to KEEP (refactored/restyled):
- `src/components/build/GroundPlane.tsx` -- reused in 3D preview
- `src/components/build/WallDrawing3D.tsx` -- reused in 3D preview
- `src/components/build/Floors3D.tsx` -- absorbed into ProceduralShell3D
- `src/components/build/InteractiveWalls3D.tsx` -- absorbed into ProceduralShell3D
- `src/lib/roomDetection.ts` -- kept as-is
- `src/lib/materials.ts` -- kept as-is
- `src/components/build/ScaleCalibration.tsx` -- adapted for 2D floorplan calibration

---

## UI Layout (Sims-inspired)

```text
+-----------------------------------------------+
| [ModeHeader - HT logo + mode name]            |
+-----------------------------------------------+
|  [BuildTopToolbar - always visible]            |
|  Select | Copy | Erase | Undo | Redo |        |
|  Grid[on] Size[0.5m] Snap[strict]             |
|  View[TopDown|3D|Isolate] Floor[V1|V2|Alla]   |
+-------+---------------------------------------+
| LEFT  |                                       |
| PANEL |    MAIN CANVAS                        |
|       |    (2D Plan View or 3D Preview)       |
| [Tab] |                                       |
| tools |                          [Inspector]  |
| based |                          (floating    |
| on    |                           right or    |
| active|                           bottom)     |
| tab   |                                       |
+-------+---------------------------------------+
| [TabBar: Structure | Import | Furnish]        |
+-----------------------------------------------+
| [BottomNav - Kontrollpanel | Enheter | Bygge] |
+-----------------------------------------------+
```

On mobile: Left panel collapses to bottom sheet. Inspector uses bottom sheet. Touch targets >= 44px.

---

## Implementation Order (8 batches)

**Batch 1: Types + Store**
- Rewrite `types.ts` with all new types
- Rewrite `useAppStore.ts` with new state shape + actions
- Create `src/lib/roomTemplates.ts`

**Batch 2: Layout shell**
- `BuildModeV2.tsx` -- main container
- `BuildTopToolbar.tsx` -- global toolbar
- `BuildTabBar.tsx` -- tab switcher
- `BuildLeftPanel.tsx` -- contextual panel container
- `BuildInspector.tsx` -- inspector container
- `FloorPicker.tsx`
- Update `Index.tsx`

**Batch 3: Structure tab + 2D canvas**
- `BuildCanvas2D.tsx` -- full rewrite with all tools
- `structure/StructureTools.tsx`
- Wall drawing, room rect, opening placement, erase, select/drag
- Grid rendering, snap modes
- Room detection integration
- Floorplan image background + calibration

**Batch 4: Templates + Paint**
- `structure/TemplatesPicker.tsx`
- `structure/PaintTool.tsx`
- Room template stamp placement in 2D canvas
- Color picker for wall/floor materials

**Batch 5: 3D Preview**
- `BuildScene3D.tsx` -- new R3F scene
- `ProceduralShell3D.tsx` -- walls + floors from layout
- Camera mode switching (top-down ortho, dollhouse, floor isolate)
- View toggle integration

**Batch 6: Home Import tab**
- `import/ImportTools.tsx`
- `ImportedHome3D.tsx` -- GLB loader + transform
- `import/ScaleCalibrationImport.tsx` -- two-point measurement
- `import/NorthAlignment.tsx`
- `import/FloorBandsEditor.tsx`
- Source switching logic (procedural vs imported)

**Batch 7: Furnish tab**
- `furnish/FurnishTools.tsx`
- `furnish/PropsCatalog.tsx`
- `Props3D.tsx` -- render placed props
- Prop placement via raycast in 3D, drag/rotate controls

**Batch 8: Polish**
- Stairs tool (basic preset placement)
- Ghost floors in 2D
- Touch optimizations (pinch zoom, 44px targets)
- Measure tool
- Undo/redo verification across all tools
- Mobile bottom sheets for panels

---

## Key Rules Enforced
- Build Mode NEVER edits Devices (read-only layer)
- No Buy/Store marketplace
- No curved walls
- No boolean mesh cutting (wall segments split around openings)
- All geometry in meters
- Touch targets >= 44px
- Procedural source: Structure tools enabled, Import read-only
- Imported source: Structure tab becomes read-only, Import tools enabled

