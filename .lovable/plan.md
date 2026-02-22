
# Fix Build Mode v2 -- Round 3

## Issues to Fix

### 1. Extra 3D geometry on doors and windows
The door and window 3D models in `InteractiveWalls3D.tsx` render frame pieces AND panels that look like extra walls (visible in the screenshot). The frame positioning uses perpendicular offsets creating visible artifacts. Simplify to: door = just a thin panel in the opening, window = glass panel + thin frame outline only.

### 2. Stairs should not have side walls/rails
`Stairs3D.tsx` renders tall side rails (`railHeight = floorHeight + 0.9`) that look like walls. Remove the side rails entirely -- just keep the treads and risers for a clean stair look.

### 3. Ceiling not blocking light properly
In `Ceilings3D.tsx`, the material uses `opacity={0}` with `transparent`. A fully transparent material won't cast shadows. Fix by using a solid opaque material on the backside only (`side: THREE.BackSide`) or use `colorWrite={false}` approach so the mesh is invisible but still writes to the depth/shadow buffer.

### 4. Sun direction and weather controls in build mode
The store already has `environment.weather` and sun data. Add a small environment panel to the top toolbar or a collapsible section that lets users:
- Rotate the directional light (sun azimuth) with a slider
- Change sun elevation angle
- Toggle weather: clear, cloudy, rain, snow
- Add simple particle effects for rain/snow in the 3D scene

New store actions needed: `setSunAngle(azimuth, elevation)` and `setWeather(condition)`.

### 5. Room naming starts at "Rum 2"
In `handlePointerUp` of `BuildCanvas2D.tsx`, rooms are created with the static name `'Rum'`. The `addRoomFromRect` action creates the room. The issue is that when creating multiple rooms, they all get "Rum" -- there's no counter. Fix by counting existing rooms: `Rum ${rooms.length + 1}`.

### 6. Floor picker -- can't add new floors
The `addFloor` function works but after adding, it doesn't switch to the new floor. Fix `FloorPicker.tsx` to auto-select the newly added floor by calling `setActiveFloor` and `setView({ floorFilter: newFloorId })` after adding.

### 7. Opening/door/window selection and editing
Currently openings can be selected (`selection.type === 'opening'`) but there's no inspector for them. Add an `OpeningInspector` component in `BuildInspector.tsx` that shows:
- Type (door/window)
- Width (editable)
- Height (editable)
- Sill height (for windows, editable)
- Position along wall (offset slider)
- Delete button

New store action needed: `updateOpening(floorId, wallId, openingId, changes)` for updating width/height/sillHeight.

### 8. Stair selection and editing
The stair inspector exists but only has delete. Add:
- Width (editable)
- Length (editable)
- Rotation slider
- Position display

New store action needed: `updateStair(floorId, stairId, changes)`.

---

## Technical Changes

### `src/store/types.ts`
- Add `updateOpening` action type
- Add `updateStair` action type
- Add `sunAzimuth` and `sunElevation` to `EnvironmentState`
- Add `setSunPosition(azimuth, elevation)` action
- Add `setWeather(condition)` action

### `src/store/useAppStore.ts`
- Add `sunAzimuth: 135` and `sunElevation: 45` to initial environment state
- Implement `updateOpening(floorId, wallId, openingId, changes)` -- updates opening's width/height/sillHeight
- Implement `updateStair(floorId, stairId, changes)` -- updates stair width/length/rotation/position
- Implement `setSunPosition(azimuth, elevation)`
- Implement `setWeather(condition)`

### `src/components/build/InteractiveWalls3D.tsx`
- Simplify door model: remove separate left/right/top frame pieces. Keep only a single thin door panel mesh centered in the opening
- Simplify window model: remove separate left/right/top/bottom frame pieces. Keep only the glass panel and a single thin frame box around it

### `src/components/build/Stairs3D.tsx`
- Remove the two side rail meshes (lines 44-58)
- Keep only treads and risers

### `src/components/build/Ceilings3D.tsx`
- Change material to be shadow-casting properly: use `meshBasicMaterial` with `colorWrite={false}` and `depthWrite={true}`, or use a solid material with `side={THREE.BackSide}` so it's only visible from below (inside the room it appears as ceiling, from outside/above it's invisible)

### `src/components/build/BuildScene3D.tsx`
- Read `sunAzimuth` and `sunElevation` from store
- Calculate directional light position from azimuth/elevation angles
- Read weather condition and add simple rain/snow particle system component

### `src/components/build/WeatherEffects3D.tsx` (new file)
- Simple particle system for rain (falling blue lines) and snow (falling white dots)
- Uses `useFrame` to animate particles downward
- Only renders when weather is 'rain' or 'snow'

### `src/components/build/BuildInspector.tsx`
- Add `OpeningInspector` component for when `selection.type === 'opening'`
  - Find the opening by searching all walls for matching opening ID
  - Editable fields: width, height, sillHeight (window only), offset
  - Delete button
- Enhance `StairInspector` with editable width, length, rotation slider, position display

### `src/components/build/BuildCanvas2D.tsx`
- Fix room naming on line 904: change `'Rum'` to `` `Rum ${rooms.length + 1}` ``

### `src/components/build/FloorPicker.tsx`
- After `addFloor`, get the new floor ID and call `setActiveFloor` + `setView({ floorFilter: newFloorId })`

### `src/components/build/BuildTopToolbar.tsx`
- Add a sun/weather controls section:
  - Sun azimuth slider (0-360 degrees)
  - Weather dropdown (clear/cloudy/rain/snow)
  - Only visible in 3D camera mode

---

## Implementation Order
1. Store changes (new actions, environment state)
2. Fix InteractiveWalls3D (simplify door/window models)
3. Fix Stairs3D (remove rails)
4. Fix Ceilings3D (proper shadow casting)
5. Fix BuildCanvas2D room naming
6. Fix FloorPicker auto-select
7. Add OpeningInspector and enhance StairInspector
8. Add sun/weather controls to BuildScene3D and toolbar
9. Create WeatherEffects3D
