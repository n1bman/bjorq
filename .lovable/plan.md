

# Fix Room Switching, 3D Interrupt, Segment ID Auto-Apply

## Problem 1: Room buttons stop working mid-cleaning
In `useHABridge.ts` line 126, switching rooms sends `vacuum.stop` first, which triggers HA to echo back a status change that overwrites the app state and cancels the pending room change. Remove the stop-then-delay — send `app_segment_clean` directly (Roborock handles interruption internally).

## Problem 2: Segment IDs not auto-applied from `roborock.get_maps`
The name-matching approach is unreliable. The `roborock.get_maps` response already contains segment IDs paired with room names. Instead of fuzzy-matching names, iterate the segment map entries and for each zone, write the `segmentId` directly onto the zone config using a reliable lookup. Also: in `useHABridge.ts`, the `data.targetRoom` is the display name (set via `startRoomCleaning`), so look up segment ID from the zone's stored `segmentId` field first, then fall back to the segment map.

**Key insight**: `startRoomCleaning` passes the room *display name* as `targetRoom`. The bridge then looks up `segmentMap[displayName]` which should work if the map has the exact name. But the zone lookup at line 142 searches by `z.roomId === data.targetRoom` — this fails because `targetRoom` is the display name, not the zone's `roomId`. Fix: also match by display name.

## Problem 3: 3D model must finish transition before responding to stop/dock
`isTransitioning.current` blocks all other movement. When status changes to `returning`, `idle`, `paused`, or `docked`, clear the transition immediately.

## Changes

### `src/hooks/useHABridge.ts`
- **Lines 124-175**: Remove `vacuum.stop` + `setTimeout` wrapper. Send `app_segment_clean` directly.
- **Line 142**: Fix zone lookup — also match zone by display name (compare `getZoneName(z.roomId)` against `data.targetRoom`), not just `z.roomId === data.targetRoom`.

### `src/components/devices/DeviceMarkers3D.tsx`
- **After line 525**: Add a `useEffect` watching `status` — when it becomes `returning`, `idle`, `paused`, or `docked`, set `isTransitioning.current = false` and `transitionTarget.current = null`.

### `src/hooks/useHomeAssistant.ts`
- **Lines 146-185**: After building `segmentMap`, iterate all zones and write `segmentId` using both exact and normalized name matching. Remove the skip-if-exists guard. Log successes and failures clearly.

| File | Change |
|------|--------|
| `src/hooks/useHABridge.ts` | Remove stop-before-segment; fix zone lookup by display name |
| `src/components/devices/DeviceMarkers3D.tsx` | Clear transition on status change |
| `src/hooks/useHomeAssistant.ts` | Ensure segment IDs are written to zones reliably |

