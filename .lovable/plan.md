

# Build Mode Overhaul: 3D-First (Sims/Vivaland Style)

## What Changes

The current Build Mode uses a **2D canvas as primary** with a 3D preview toggle. This overhaul flips that: **3D is the default and primary view**, with all building (wall drawing, object placement, material painting) happening directly in the 3D scene via raycasting. The UI panels overlay on top of the 3D view, just like in The Sims and Vivaland.

---

## Architecture Changes

### 1. BuildMode layout becomes 3D-first
- The `BuildPreview3D` canvas becomes the main view (always visible)
- 2D canvas becomes an optional minimap or is removed entirely
- Toolbar and side panels float over the 3D scene as glassmorphism overlays
- Floor manager stays as a floating top-left panel

### 2. 3D Wall Drawing via Raycasting
- When "Vagg" tool is active, clicking on the ground plane places wall nodes in 3D
- A transparent ground plane mesh acts as the raycast target
- Grid snapping works in 3D world coordinates (already in meters)
- Wall preview line renders as a dashed 3D line while drawing
- Double-click finishes the wall chain (same behavior as current 2D)
- Walls immediately render as extruded 3D meshes (using existing `Walls3D`)

### 3. 3D Selection & Interaction
- Select tool: click on wall meshes to select (raycast against wall geometry)
- Drag wall nodes in 3D (constrained to ground plane)
- Selected wall highlights with outline or color change
- Opening placement: click on selected wall to place door/window at offset

### 4. Camera Controls
- OrbitControls with Sims-style defaults: 45-degree isometric angle
- Scroll to zoom, right-drag to rotate, middle-drag to pan
- Wall drawing disables orbit rotation (only pan allowed)
- Keyboard shortcuts: WASD for pan, Q/E for rotate

### 5. UI Overlay Layout (Sims-inspired)
- Top toolbar: floating glassmorphism bar with tools (like Sims top bar)
- Left panel: collapsible category panel for materials/props (like Sims catalog)
- Right panel: properties for selected wall/room
- Bottom-left: floor manager and minimap
- All panels are semi-transparent, floating over the 3D scene

---

## Technical Details

### Files to modify:
- `src/components/build/BuildMode.tsx` -- complete layout restructure, 3D canvas as base layer with overlay UI
- `src/components/build/BuildPreview3D.tsx` -- add ground plane raycast target, wall drawing logic in 3D, selection raycasting, node dragging
- `src/components/build/BuildToolbar.tsx` -- restyle as floating top bar overlay
- `src/components/build/Walls3D.tsx` -- add selection highlighting, node spheres for dragging
- `src/store/types.ts` -- no major changes needed (wall data is already in meters)
- `src/store/useAppStore.ts` -- no major changes needed

### Files to create:
- `src/components/build/BuildScene3D.tsx` -- new main 3D scene component combining ground plane, grid, walls, floors, props, and all interactive raycasting logic
- `src/components/build/GroundPlane.tsx` -- invisible raycast target + visible grid
- `src/components/build/WallDrawing3D.tsx` -- 3D wall drawing preview (dashed lines, node spheres)
- `src/components/build/InteractiveWalls3D.tsx` -- walls with click-to-select, hover highlight, node drag handles

### Files to keep (restyled as overlays):
- `src/components/build/WallProperties.tsx` -- floating right panel
- `src/components/build/RoomList.tsx` -- floating panel
- `src/components/build/MaterialsPanel.tsx` -- collapsible left catalog
- `src/components/build/PropsPanel.tsx` -- part of left catalog
- `src/components/build/FloorManager.tsx` -- floating bottom-left
- `src/components/build/ScaleCalibration.tsx` -- modal/overlay

### Canvas2D.tsx:
- Kept as optional 2D minimap view (small corner overlay) or removed entirely

---

## Implementation Order

1. **BuildScene3D + GroundPlane**: Ground plane with raycast, grid, camera controls
2. **WallDrawing3D**: 3D wall drawing via ground plane clicks, preview lines
3. **InteractiveWalls3D**: Selectable/draggable walls with highlights and node handles
4. **BuildMode layout**: Restructure to 3D-first with floating overlay panels
5. **BuildToolbar restyle**: Floating glassmorphism top bar
6. **Panel overlays**: Reposition all side panels as floating overlays
7. **Camera management**: Disable orbit during wall draw, add keyboard controls

