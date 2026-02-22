

# Phase 2 Continuation – Remaining Build Mode Features

## Status Check
Already done: Floor management, floorplan import, scale calibration, basic wall drawing (nodes, snap, select, delete, undo/redo), 2D canvas with zoom/pan.

Remaining from Phase 2:
- Wall openings (doors and windows)
- Room detection from closed wall loops
- Materials system with presets
- Props system (GLB/GLTF import)
- 3D wall extrusion preview

---

## 2.3a Wall Openings (Doors & Windows)

New build tool "opening" added to toolbar. When a wall is selected, user can place a door or window on it.

**Store changes** (`types.ts`):
- Add `BuildTool` value: `'opening'`
- Add to `BuildState`: `openingType: 'door' | 'window'`

**Store actions** (`useAppStore.ts`):
- `addOpening(floorId, wallId, opening)` – push opening onto wall's openings array
- `removeOpening(floorId, wallId, openingId)` – remove opening
- `setOpeningType(type)` – set door or window for placement

**New component**: `src/components/build/WallProperties.tsx`
- Side panel shown when a wall is selected
- Shows wall length (calculated), height, thickness
- Lists openings on that wall with delete button
- "Lägg till dörr" / "Lägg till fönster" buttons
- Opening offset slider (0-100% along wall)
- Width/height inputs

**Canvas2D updates**:
- Render openings as colored markers on walls (blue rectangles for windows, brown for doors)
- Click on wall + click position to place opening at calculated offset

---

## 2.4 Room Detection & Materials

**Room detection** (`src/lib/roomDetection.ts`):
- Graph-based cycle detection from wall segments
- Find minimal closed loops of connected walls
- Auto-generate rooms with default names ("Rum 1", "Rum 2"...)
- Triggered via a "Detektera rum" button in toolbar

**Store changes**:
- `addRoom(floorId, room)` / `removeRoom(floorId, roomId)` / `renameRoom(floorId, roomId, name)`
- `setRoomMaterial(floorId, roomId, target: 'floor' | 'wall', materialId)`

**Materials system** (`src/store/types.ts`):
- New `Material` type: `{ id, name, type: 'paint' | 'concrete' | 'wood', color, roughness }`
- Preset materials defined in `src/lib/materials.ts`

**New component**: `src/components/build/MaterialsPanel.tsx`
- Glass-panel sidebar listing rooms
- Per-room: rename, pick floor material, pick wall material
- Material picker with preset swatches + color picker + roughness slider

**New component**: `src/components/build/RoomList.tsx`
- Shows detected rooms
- Click to rename, delete

**Canvas2D updates**:
- Fill detected room polygons with semi-transparent material color

---

## 2.5 Props System (GLB/GLTF Import)

**Store changes** (`types.ts` / `useAppStore.ts`):
- `addProp(prop)` / `removeProp(id)` / `updateProp(id, changes)`
- Props already defined in types

**New component**: `src/components/build/PropsPanel.tsx`
- "Importera 3D-modell" button to upload GLB/GLTF
- File stored as object URL
- List of placed props with delete/select
- Position (x, z), rotation slider, scale slider per prop

Props are 3D-only, so they render in the 3D preview (Phase 2.6).

---

## 2.6 3D Wall Extrusion Preview

**New component**: `src/components/build/Walls3D.tsx`
- Reads walls from active floor
- For each wall segment: creates a BoxGeometry extruded along the wall line
- Wall height and thickness from wall data
- Splits mesh visually around openings (separate box segments with gaps)
- Uses material color from assigned materialId or default amber

**New component**: `src/components/build/Floors3D.tsx`
- For each detected room: renders floor plane at room elevation
- Uses room floor material color

**Integration into Scene3D or a new `BuildPreview3D`**:
- Toggle between 2D canvas and 3D preview in Build mode
- Add "3D Förhandsgranskning" button to toolbar

---

## Implementation Order

1. Wall openings (store actions + WallProperties panel + Canvas2D rendering)
2. Materials presets library
3. Room detection algorithm + RoomList UI
4. MaterialsPanel for room material assignment
5. 3D wall extrusion (Walls3D + Floors3D)
6. Props system (PropsPanel + store actions)
7. 3D preview toggle in Build mode

---

## Technical Details

**Files to create**:
- `src/components/build/WallProperties.tsx`
- `src/components/build/RoomList.tsx`
- `src/components/build/MaterialsPanel.tsx`
- `src/components/build/PropsPanel.tsx`
- `src/components/build/Walls3D.tsx`
- `src/components/build/Floors3D.tsx`
- `src/lib/roomDetection.ts`
- `src/lib/materials.ts`

**Files to modify**:
- `src/store/types.ts` – add Material type, extend BuildTool, add store actions
- `src/store/useAppStore.ts` – implement new actions
- `src/components/build/BuildToolbar.tsx` – add opening tool, room detection button, 3D preview toggle
- `src/components/build/Canvas2D.tsx` – render openings and room fills
- `src/components/build/BuildMode.tsx` – integrate new side panels
- `src/components/Scene3D.tsx` – add Walls3D and Floors3D components

