

# Fix Build Mode v2 -- Missing Features and Interactions

## Problem Summary
Build Mode v2 has the shell and UI in place but is missing critical interactive functionality. Walls and rooms are visible but cannot be moved, dragged, or interactively edited. Several tools (door/window placement, room rectangle drawing) don't work in the 2D canvas. There's also stale data persisting and no way to clear everything.

## What Will Be Fixed

### 1. Clear All / Reset Button
- Add a "Rensa allt" (Clear All) button to the top toolbar
- Clears all walls, rooms, stairs, and props for the active floor (or all floors)
- Bump persist migration version to 3 to force-clear any stale localStorage data on load

### 2. Wall Node Dragging (Select Tool)
- When select tool is active and user clicks near a wall endpoint (node), start dragging that node
- On pointer move, update the wall's `from` or `to` via `updateWallNode`
- Snap to grid during drag
- Connected walls (sharing the same node) move together

### 3. Wall Segment Dragging
- When select tool is active and user clicks on the middle of a wall (not near endpoints), start dragging the entire wall segment
- Both endpoints move by the same delta
- Snap to grid

### 4. Wall Splitting
- When select tool is active and user double-clicks on a wall segment, split it at that point using `splitWall`

### 5. Door/Window Placement Tool
- When door or window tool is active, clicking on a wall places an opening at the click position
- Calculate the offset (0-1) along the wall from the click point
- Use `addOpening` with default dimensions
- Push undo before placement

### 6. Room Rectangle Drag Tool
- When room tool is active, pointer down starts the rectangle, pointer move updates end point, pointer up creates the room
- Draw rectangle preview while dragging (dashed outline)
- On release, call `addRoomFromRect` with the snapped coordinates
- Push undo

### 7. Room Selection in 2D Canvas
- When select tool is active, clicking inside a room polygon selects it
- Show room inspector with rename, material, and delete options
- Add room inspector to BuildInspector

### 8. Opening Dragging Along Wall
- When select tool is active and user clicks on an opening marker, allow dragging it along the wall to change its offset

### 9. Improve "Ghost Floors" Explanation
- Rename the ghost button tooltip from "Visa andra vaningar" to a clearer label
- Add a small descriptive text in the status bar when ghost is active: "Visar andra vaningars vaggar som skuggor"

### 10. Improve Clear All UX
- Add confirmation dialog before clearing

---

## Technical Changes

### `src/store/useAppStore.ts`
- Add `clearFloor(floorId)` action: removes all walls, rooms, stairs from a floor
- Add `clearAllFloors()` action: clears all floors' walls/rooms/stairs and all props
- Bump persist version to 3

### `src/components/build/BuildCanvas2D.tsx` (major rewrite of interaction handlers)
- Add state for wall node dragging: `dragNode: { wallId, endpoint: 'from'|'to', connectedWalls } | null`
- Add state for wall segment dragging: `dragWall: { wallId, startFrom, startTo, mouseStart } | null`
- Add state for room rectangle drawing: use existing `roomDrawing` state
- Add `findNodeAt(sx, sy)` -- finds wall endpoint near cursor
- Add `findRoomAt(sx, sy)` -- point-in-polygon test for room selection
- Update `handlePointerDown`:
  - Select tool: check node first, then prop, then wall, then room, then deselect
  - Door/Window tool: find wall at click, place opening
  - Room tool: start rectangle drag
- Update `handlePointerMove`:
  - Handle node dragging (update wall node + connected walls)
  - Handle wall segment dragging
  - Handle room rectangle preview
- Update `handlePointerUp`:
  - Finish node/wall drag
  - Finish room rectangle (create room)
- Add room rectangle preview rendering in draw loop
- Add opening selection rendering

### `src/components/build/BuildInspector.tsx`
- Add Room Inspector section (when selection.type === 'room'):
  - Room name (editable)
  - Area display
  - Wall/floor material color
  - Delete room button

### `src/components/build/BuildTopToolbar.tsx`
- Add "Rensa allt" button with trash icon + confirmation

### `src/store/types.ts`
- No changes needed (types already support everything)

## Implementation Order
1. Store changes (clearFloor, clearAllFloors, persist v3)
2. BuildCanvas2D interaction handlers (node drag, wall drag, door/window placement, room rectangle, room selection)
3. BuildInspector room inspector
4. BuildTopToolbar clear all button
5. Ghost floors tooltip improvement

