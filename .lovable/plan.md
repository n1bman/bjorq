

# Fix Segment ID Auto-Sync, Add Speed Slider, Fix Dust Sync

## Issues

1. **Speed slider missing** — User wants to control 3D vacuum speed from RobotPanel
2. **Dust effect not synced** — Particles spawn at vacuum position but the `instancedMesh` is inside the `<group ref={meshRef}>` which moves, so particle world positions are double-offset. Need to render dust particles outside the moving group or compensate for group transform
3. **Segment ID auto-fill not working** — The auto-fill in `useHomeAssistant.ts` (line 138) skips zones that already have a `segmentId` set (`if (zone.segmentId) continue`), but even for zones without one, the `roborock.get_maps` response format may not be parsed correctly. The room name matching also seems to fail for some rooms like "Tvrummet"

## Changes

### `src/store/types.ts`
- Add `vacuumSpeed?: number` to `VacuumState` (default 0.07, range 0.02–0.15)

### `src/components/home/cards/RobotPanel.tsx`
- Add a speed slider (Slider component) in VacuumCard between dust toggle and cleaning log, labeled "3D-hastighet" with value range 0.02–0.15, step 0.01

### `src/components/devices/DeviceMarkers3D.tsx`
- Read `vacuumSpeed` from state instead of hardcoded `0.07` (line 585)
- **Fix dust sync**: The dust particles are rendered inside `<group ref={meshRef}>` which moves with the vacuum. Particle positions are set in world space but rendered in local group space. Fix by either:
  - Converting particle positions to local space (subtract group position), OR
  - Moving `<instancedMesh>` outside the group to a sibling element at world origin

### `src/hooks/useHomeAssistant.ts` (lines 111-158)
- **Fix segment parsing**: Log the raw `rooms` object structure more verbosely to debug format
- Add additional parsing paths: the `roborock.get_maps` response may have rooms as an array of `{ id: number, name: string }` objects rather than a key-value map
- Remove the `if (zone.segmentId) continue` guard so auto-discovered IDs always overwrite (or at least verify the existing one matches)
- After auto-fill, log which zones got IDs and which didn't for debugging

