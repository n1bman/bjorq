

# Fix Vacuum Segment Auto-Sync, Home Widget Rooms, Speed & Dust Effect

## Issues

1. **Speed**: Change from 0.04 to 0.07 m/s — one-line fix
2. **Segment IDs not auto-applied**: The `vacuumSegmentMap` from `roborock.get_maps` stores `{ "Tvrummet": 16 }` but the lookup in `useHABridge.ts` line 131 uses `data.targetRoom` which is the zone's `roomId` (often a generated ID, not the display name). The zone's `roomId` might not match the key in `vacuumSegmentMap`. Need to also try looking up by display name (resolved via `getZoneName`). Additionally, the auto-discovered segment IDs should be written back into the zone config so they persist and work everywhere.
3. **Home widget missing room buttons**: The compact vacuum view in `DeviceControlCard.tsx` (lines 144-181) only shows basic Start/Pause/Stop/Home — no room-specific cleaning buttons. Need to add a room picker popup icon.
4. **Dust particle effect**: Add a particle cloud behind the vacuum in 3D when cleaning, with a toggle in RobotPanel settings.

## Changes

### `src/components/devices/DeviceMarkers3D.tsx`
- Line 580: Change `0.04` to `0.07`
- Add dust particle system (small translucent spheres trailing behind vacuum when `status === 'cleaning'`), controlled by a new `showDustEffect` flag in VacuumState (default true)

### `src/store/types.ts`
- Add `showDustEffect?: boolean` to `VacuumState` (default true)

### `src/hooks/useHABridge.ts` (lines 130-131)
- When looking up `segmentMap[data.targetRoom]`, also try resolving the room display name from floors/rooms if the direct lookup fails. This ensures "Tvrummet" matches even if the zone's `roomId` is different.

### `src/hooks/useHomeAssistant.ts` (after segment map is stored)
- After calling `setVacuumSegmentMap`, also iterate vacuum zones and auto-fill `segmentId` on each zone where the zone name matches a key in the segment map. This writes the auto-discovered IDs into the zone config.

### `src/components/home/cards/DeviceControlCard.tsx` (lines 144-181)
- Add a room picker popup button (small MapPin icon) to the compact vacuum widget. When clicked, show a popover/dropdown with available rooms from vacuum zones. Clicking a room triggers room-specific cleaning.

### `src/components/home/cards/RobotPanel.tsx`
- Add a toggle in VacuumCard for "Visa dammeffekt i 3D" that sets `showDustEffect` on/off

## Files

| File | Change |
|------|--------|
| `src/store/types.ts` | Add `showDustEffect?: boolean` to VacuumState |
| `src/hooks/useHomeAssistant.ts` | Auto-fill zone segment IDs from discovered map |
| `src/hooks/useHABridge.ts` | Fix room name lookup to resolve display names |
| `src/components/devices/DeviceMarkers3D.tsx` | Speed 0.07, add dust particles |
| `src/components/home/cards/DeviceControlCard.tsx` | Add room picker to compact vacuum widget |
| `src/components/home/cards/RobotPanel.tsx` | Add dust effect toggle |

