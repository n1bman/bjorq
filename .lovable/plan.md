

# Fix Build Mode v2 -- Round 2

## Issues Found and Solutions

### 1. Floor rendered outside rooms (3D coordinate bug)
**Root cause**: In `Floors3D.tsx`, the room polygon uses `[x, z]` coordinates to create a `THREE.Shape` in the XY plane. When rotated `-PI/2` around the X axis, the Y values get negated, so world Z = -polygon_z. This causes the floor to appear mirrored/offset.

**Fix**: In `Floors3D.tsx`, negate the Z coordinates when building the shape: use `shape.moveTo(polygon[0][0], -polygon[0][1])` and `shape.lineTo(polygon[i][0], -polygon[i][1])`.

### 2. Wall materials not applied from room settings
**Root cause**: The Room Inspector sets `room.wallMaterialId`, but `InteractiveWalls3D.tsx` only reads `wall.materialId` (per-wall property). There is no connection between a room's wall material setting and the actual wall rendering.

**Fix**: In `InteractiveWalls3D.tsx`, look up which room each wall belongs to (by checking `room.wallIds`). If the room has a `wallMaterialId` and the wall has no own `materialId`, use the room's material. Same fix needed in the non-interactive `Walls3D.tsx`.

### 3. Invisible roof/ceiling for shadow control
**Problem**: Light passes through the top of rooms unrealistically. Need an invisible ceiling that blocks light (casts shadows) but is not visually opaque.

**Fix**: Create a new `Ceilings3D.tsx` component that renders a flat mesh at the top of each room (at `elevation + heightMeters`). Use `meshStandardMaterial` with `visible={false}` but `castShadow={true}` -- or use a `shadowMaterial` approach. The ceiling mesh uses the same polygon shape as the floor but positioned at ceiling height. Add it to `BuildScene3D.tsx`.

### 4. Simple 3D door/window/stair models
**Problem**: Doors and windows are just gaps in walls. No visual indicator in 3D view.

**Fix**: 
- **Doors**: Add a thin box (door frame) and a slightly inset panel (the door leaf) at each door opening position in `InteractiveWalls3D.tsx`. Color: brown/wood.
- **Windows**: Add a thin transparent panel (glass) with a frame at each window opening. Use `meshPhysicalMaterial` with `transmission` for glass effect.
- **Stairs**: Create a `Stairs3D.tsx` component that renders stair treads as a series of box meshes, positioned according to the stair data.

### 5. Floor picker appears grayed out / non-functional
**Root cause**: The FloorPicker code looks correct but the `floorFilter` state may conflict with `activeFloorId`. When "Alla vaningar" is selected, `floorFilter` is `'all'` but `activeFloorId` remains unchanged. The label says "Alla" which is confusing. Additionally, the dropdown header should say "Vaningar" not "Alla".

**Fix**: 
- Rename the button label from "Alla" to "Vaningar" when showing all floors
- Ensure clicking a specific floor always sets both `activeFloorId` AND `floorFilter`
- Make sure the canvas and tools respect the active floor properly

### 6. Room polygon updates when walls are dragged
**Problem**: After detecting or creating rooms, dragging a wall node does not update the room polygon, so the room shape becomes stale.

**Fix**: Add a `updateRoomPolygon` action to the store. After any wall node drag completes (in `handlePointerUp` of `BuildCanvas2D.tsx`), recalculate all room polygons on the active floor by reading the current wall positions. Each room stores `wallIds` -- iterate those walls and rebuild the polygon from connected endpoints.

### 7. Paint tool not working for walls
**Problem**: The `PaintTool` component in the left panel sets `room.wallMaterialId` and `room.floorMaterialId`, which is correct for rooms. But individual wall materials (`wall.materialId`) are never set. The paint tool only works per-room, not per-wall.

**Fix**: This is actually working as designed (per-room material). The real issue is #2 above -- the 3D rendering ignores room materials. Once #2 is fixed, the paint tool will work. Additionally, add visual feedback in the 2D canvas: render room fills using the floor material color.

---

## Technical Changes

### `src/components/build/Floors3D.tsx`
- Negate Z coordinates in shape construction: `shape.moveTo(polygon[0][0], -polygon[0][1])`

### `src/components/build/Ceilings3D.tsx` (new file)
- Render invisible shadow-casting ceiling meshes per room
- Same polygon logic as Floors3D but at `elevation + heightMeters`
- Material: `visible={false}`, mesh has `castShadow={true}`

### `src/components/build/Stairs3D.tsx` (new file)
- Render stair treads as stacked boxes
- Read from `floor.stairs` data

### `src/components/build/InteractiveWalls3D.tsx`
- Look up room wall materials and apply them to wall meshes
- Add simple door frame + panel meshes at door openings
- Add glass panel + frame meshes at window openings

### `src/components/build/BuildScene3D.tsx`
- Add `Ceilings3D` and `Stairs3D` components

### `src/components/build/FloorPicker.tsx`
- Change label from "Alla" to "Vaningar"
- Ensure proper floor switching behavior

### `src/store/useAppStore.ts`
- Add `updateRoomPolygons(floorId)` action that recalculates room polygons from current wall positions

### `src/store/types.ts`
- Add `updateRoomPolygons` to AppState interface

### `src/components/build/BuildCanvas2D.tsx`
- After wall node/segment drag ends, call `updateRoomPolygons`
- Render room floor fills using material color in 2D view
- When room tool draws a rectangle, the created room walls should have their polygon auto-updated

### `src/components/build/BuildCanvas2D.tsx` (2D room fill colors)
- In the room drawing section, use the room's `floorMaterialId` to get the material color and fill the room polygon with it instead of the default blue tint

## Implementation Order
1. Fix Floors3D coordinate bug (quick fix)
2. Add `updateRoomPolygons` store action
3. Fix wall material lookup from rooms in InteractiveWalls3D
4. Create Ceilings3D for shadow-casting invisible roof
5. Add door/window 3D representations in InteractiveWalls3D
6. Create Stairs3D component
7. Update BuildScene3D to include new components
8. Fix FloorPicker labels and behavior
9. Update BuildCanvas2D for room polygon refresh and material-colored fills
