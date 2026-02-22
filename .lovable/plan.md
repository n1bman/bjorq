

# Fix Build Mode v2 -- Round 5

## Issues to Address

### 1. Imported model rotation not working
The `ImportedHome3D.tsx` component applies `rotation` from the store, but the Import Tools panel only has sliders for position, scale, and north angle -- there is NO rotation slider. The `rotation` field in the store defaults to `[0, 0, 0]` and is never changed by the UI. Need to add a Y-axis rotation slider to the Import Tools panel (most users only need to rotate around Y to orient their home).

### 2. Weather effects (rain/snow) should only appear OUTSIDE the building
Currently `WeatherEffects3D` spawns particles across the entire 40x40m area including inside rooms. The simplest approach: don't try to exclude particles from inside the building (too complex). Instead, ensure the ceiling blocks the particles visually -- particles that fall below the ceiling height inside rooms should be hidden. However, this is hard with a particle system. A pragmatic solution: spawn particles in a donut/ring shape around the building center, or simply raise the spawn area and let the ceiling mesh occlude them. Since the ceiling uses `colorWrite={false}`, it won't actually occlude. Best approach: make particles only spawn in a ring OUTSIDE a configurable radius from center (e.g., outside 8m radius), so they fall around the house, not through it.

### 3. Ceiling not working for imported models
`Ceilings3D.tsx` only renders ceilings for rooms with polygons (procedural mode). For imported models, there is no room data, so no ceiling is generated. Since imported GLB models typically already have their own roof geometry, no invisible ceiling is needed for those. However, sunlight still passes through the imported model's windows -- that's actually correct behavior. The user seems to want an invisible ceiling ON TOP of the imported model. We can add a simple large flat plane at a configurable ceiling height when in imported mode.

### 4. Google coordinates for real-world positioning
The store already has `location: { lat, lon, timezone }` in the environment state. Add input fields for latitude and longitude in the Import Tools or a new "Plats" (Location) section. This could also be used to calculate real sun position based on time and coordinates in the future.

### 5. Room numbering still seems off
The previous fix changed room naming to `Rum ${rooms.length + 1}`, but there may be phantom rooms or the count may not reflect visible rooms. Need to verify and ensure naming scans for the next available number.

---

## Technical Changes

### `src/components/build/import/ImportTools.tsx`
- Add a Y-rotation slider (0-360 degrees) that calls `setImportedModel({ rotation: [0, degrees, 0] })`
- Add a "Plats" (Location) section with latitude and longitude input fields that update `environment.location`
- Add an optional "Takhojd" (ceiling height) input for imported models that controls an invisible ceiling plane height

### `src/components/build/ImportedHome3D.tsx`
- No changes needed (rotation already applied from store)

### `src/components/build/WeatherEffects3D.tsx`
- Change particle spawn to a ring shape: only spawn particles where `distance from center > minRadius` (e.g., 6m)
- This ensures rain/snow falls around the building, not through it
- Add a simple check: if `sqrt(x^2 + z^2) < minRadius`, re-randomize position to be outside

### `src/components/build/Ceilings3D.tsx`
- Add a section for imported mode: when `homeGeometry.source === 'imported'`, render a large invisible shadow-casting plane at a configurable height (default: the floor's heightMeters)
- This prevents light from passing through the top of imported models

### `src/store/useAppStore.ts`
- Add `setLocation(lat, lon)` action to update `environment.location`

### `src/store/types.ts`
- Add `setLocation` action signature

## Implementation Order
1. Add rotation slider to ImportTools
2. Fix weather particle spawn ring
3. Add imported model ceiling plane
4. Add location inputs
5. Add store action for location

