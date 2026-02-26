

# Robot Vacuum System Overhaul

## Problem 1: Vacuum wanders off-map
The outer `<group>` at line 946 sets `position={marker.position}`, but `VacuumMarker3D` internally moves `meshRef.current.position` using **world-space** zone polygon coordinates. This creates a double-offset: the vacuum ends up at `marker.position + zone.worldCoord`.

**Fix in `DeviceMarkers3D.tsx`**:
- Special-case vacuum in the render loop (lines 943-955): do NOT apply `position` on the outer group for vacuum markers. Instead, pass `marker.position` as `position` prop directly (like before the rotation fix).
- Inside `VacuumMarker3D`, the `meshRef` already moves in world space — this is correct for a roaming device. The outer group should only apply rotation (if any), not position.

## Problem 2: Zone naming — no rename capability
Zones get auto-named "Zon 1", "Zon 2" or room name, but users can't edit them.

**Fix**:
- Add `renameVacuumZone(floorId, oldRoomId, newRoomId)` action in `useAppStore.ts`.
- In `VacuumMappingTools.tsx`: make zone names **editable** — click on name to show an inline text input. On blur/enter, call `renameVacuumZone`. Also add a dropdown of existing room names to pick from.
- The `roomId` field on `VacuumZone` effectively serves as both ID and display name. Renaming updates this field.

## Problem 3: Dock 3D model + movable
Currently dock is just a 2D coordinate with no 3D representation.

**Fix in `DeviceMarkers3D.tsx`**:
- Add `VacuumDock3D` component: a small charging station model (flat rectangular base ~0.15x0.10m, with a small vertical back plate, LED indicator). Rendered at `mapping.dockPosition` for each floor that has one.
- Render docks in the main `DeviceMarkers3D` component by iterating floors with `vacuumMapping.dockPosition`.
- Make dock **selectable and draggable** in build mode by reusing the same drag handlers, updating position via `setVacuumDock`.

## Problem 4: HA zone sync awareness
When HA provides room names (e.g., from Roborock integration), zones should auto-match. The `currentRoom` from HA state already contains the room name (e.g., "Kök"). Zone matching in `activeZone` (line 498-506) tries `z.roomId === currentRoom` — this works if the zone's `roomId` matches the HA room name exactly.

**Fix**: In zone creation (BuildCanvas2D line 1188), prioritize matching against HA entity room names. Add a note in the UI that zone names should match HA room names for auto-sync. Show a warning icon if a zone name doesn't match any known HA room.

---

## Files to modify

| File | Changes |
|------|---------|
| `src/components/devices/DeviceMarkers3D.tsx` | 1) Special-case vacuum in render loop to not double-offset position. 2) Add `VacuumDock3D` component. 3) Render docks from floor vacuumMapping. |
| `src/store/useAppStore.ts` | Add `renameVacuumZone` action. |
| `src/store/types.ts` | Add `renameVacuumZone` to AppState interface. |
| `src/components/build/devices/VacuumMappingTools.tsx` | Editable zone names with inline input + room name dropdown. Show HA sync status per zone. |
| `src/components/build/BuildCanvas2D.tsx` | Render dock marker in 2D canvas. Allow dock dragging in 2D. |

### VacuumDock3D design
```text
  ┌──────┐  ← back plate (0.12w × 0.04h × 0.01d)
  │  LED │
  └──────┘
 ┌────────┐  ← base plate (0.15w × 0.01h × 0.10d)
 └────────┘
```
- Dark gray base, slightly lighter back plate
- Green LED dot when vacuum is docked
- Selection ring in build mode
- Clickable + draggable, updates `setVacuumDock`

