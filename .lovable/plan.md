

# Fix Build Mode v2 -- Round 4

## Issues and Solutions

### 1. Grayed-out buttons / dropdowns not interactive
The "Rensa allt" dialog, "Sol & Vader" panel, and "Vaningar" dropdown all render as `absolute` panels from within the toolbar. But the toolbar sits ABOVE the 3D Canvas which captures pointer events. The dropdown panels drop BELOW the toolbar into the canvas area. The `z-50` should work for 2D canvas, but for the 3D Canvas (WebGL via `<Canvas>`), the Three.js canvas element captures events regardless of z-index. 

**Fix**: The dropdowns/popups need to be rendered as portals or the toolbar wrapper needs `pointer-events: auto` and the panels need `pointer-events: auto` explicitly. Also, the `BuildTopToolbar` parent div uses `relative` positioning for the absolute panels -- need to ensure the panels have `pointer-events-auto` and are NOT obscured by the canvas. The real fix: move the popup panels outside the toolbar flow by adding `pointer-events-auto` and ensure the toolbar wrapper has a higher z-index than the canvas area.

### 2. X-pattern (cross) in windows
In `InteractiveWalls3D.tsx` line 162, the window frame uses `wireframe` material which creates the visible X/cross pattern in each window.

**Fix**: Remove `wireframe` from the window frame material. Instead, create 4 thin frame bars (top, bottom, left, right) as separate box meshes, or simply remove the frame mesh entirely and keep only the glass panel.

### 3. Phantom "Rum 1" in Paint Tool
The persist migration v3 returns `undefined` which should clear data, but the `migrate` function might not fire correctly or stale data persists. Also, `addRoomFromRect` in the store creates room walls AND adds a room -- the room counter `rooms.length + 1` counts from the current floor's rooms, but there might be a leftover room from detection or initial state.

**Fix**: 
- Update the room naming to scan existing room names and find the next available number
- Make the "Rensa allt" button also properly clear rooms
- In PaintTool, if a room has no valid polygon (empty or fewer than 3 points), skip it

### 4. Imported 3D model -- detecting windows/doors
This is a complex feature. A GLB/GLTF model is just geometry -- there's no automatic way to know where windows and doors are. However, we can provide a manual workflow: after importing a model, let users place "opening markers" on the model by clicking positions in 3D view.

**Fix**: For now, add a note/tooltip in the Import tab explaining that windows/doors need to be placed manually on imported models. Add the ability to use the door/window tool in 3D view when an imported model is active -- clicking on the ground plane places a marker. This is a future enhancement; for this round, just add the explanatory text.

### 5. Floor picker not switching properly
The floor picker dropdown buttons need to ensure both `activeFloorId` and `floorFilter` are set. Looking at the code, this appears correct. The issue might be that when in 3D mode, the `InteractiveWalls3D`, `Floors3D`, `Ceilings3D`, and `Stairs3D` all filter by `activeFloorId`, so switching floors should work. The real issue might be visual -- the dropdown buttons inherit `text-foreground` but might appear grayed out due to contrast.

**Fix**: Add more visual distinction to floor buttons -- use brighter text and active indicators.

### 6. Room resizing (drag wall, connected walls follow)
When dragging a wall that belongs to a room, `updateRoomPolygons` is already called. But adjacent walls (sharing corners) need to update too. The `findConnectedWalls` function finds walls sharing the same endpoint, and during node drag, connected walls move. This should work. The issue might be that room polygons aren't updating correctly because the `updateRoomPolygons` action chains walls incorrectly.

**Fix**: Review and improve `updateRoomPolygons` logic in the store to handle all edge cases.

---

## Technical Changes

### `src/components/build/BuildTopToolbar.tsx`
- Wrap the toolbar in a container that has `relative z-50` so dropdown panels appear above the canvas
- Add `pointer-events-auto` to dropdown panels
- Add a backdrop overlay when panels are open to catch clicks outside

### `src/components/build/InteractiveWalls3D.tsx`
- Remove `wireframe` from window frame material (line 162)
- Replace with 4 thin frame bars (top/bottom/left/right box meshes) or just remove the frame mesh

### `src/components/build/BuildCanvas2D.tsx`
- Improve room naming: scan existing names to find next available number
- After wall drag, ensure `updateRoomPolygons` is called for the active floor

### `src/components/build/structure/PaintTool.tsx`
- Filter out rooms with no valid polygon (less than 3 points)
- Show room count correctly

### `src/components/build/FloorPicker.tsx`
- Add clearer visual styling for floor buttons
- Ensure pointer events work when over 3D canvas

### `src/components/build/import/ImportTools.tsx`
- Add info text explaining that imported models need manual door/window placement

### `src/store/useAppStore.ts`
- Verify `updateRoomPolygons` correctly rebuilds polygons from wall chain

## Implementation Order
1. Fix window X-pattern (quick one-liner)
2. Fix toolbar dropdown z-index/pointer-events
3. Fix floor picker styling and behavior
4. Fix room naming logic
5. Filter phantom rooms in PaintTool
6. Add import info text
7. Verify room polygon update logic

