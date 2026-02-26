

# Fix Vacuum Segment Sync, Stop Behavior, Speed, and Error Display

## 1. Segment ID Display and Sync Fix

**Problem**: The segment map is built correctly from `roborock.get_maps`, but the zone `roomId` often doesn't match the display name in the segment map. The auto-fill logic works but matching fails for rooms where the zone's `roomId` is a generated ID.

**File: `src/hooks/useHomeAssistant.ts`** (lines 131-156)
- Add verbose logging of the raw `rooms` object to debug the format: `console.log('[HA] Raw rooms object:', JSON.stringify(rooms))`
- Also try matching by iterating the segment map keys against partial/substring matches
- Log each zone's `roomId` vs `displayName` to trace the mismatch

**File: `src/components/build/devices/VacuumMappingTools.tsx`**
- Show the auto-discovered `segmentId` next to each zone in the mapping UI so the user can see which zones got IDs and which didn't
- Display the full `vacuumSegmentMap` as a reference list so the user can verify HA room names

## 2. Stop Button — Stay in Place, Don't Dock

**Problem**: Stop button sets `status: 'docked'` which triggers `return_to_base` in the bridge AND makes the 3D model navigate to the dock station.

**File: `src/components/home/cards/RobotPanel.tsx`** (line 479)
- Change stop action from `{ status: 'docked' }` to `{ status: 'idle' }`

**File: `src/components/home/cards/DeviceControlCard.tsx`**
- Same fix for any stop button in the compact widget

**File: `src/hooks/useHABridge.ts`** (line 180-181)
- Ensure `idle` status maps to `vacuum.stop` (already does at line 181, just verify)

**File: `src/components/devices/DeviceMarkers3D.tsx`** (lines 662-677)
- Add handling for `status === 'idle'`: robot stays at current position (no movement), same as `paused`
- Currently only `returning`/`docked` trigger dock navigation; `idle` falls through to no-op which is correct, but also need to stop any ongoing lawnmower pattern

## 3. 3D Speed Slider Not Affecting Animation

**Problem**: `vacuumSpeed` is stored in device state. Changing it triggers `useHABridge` which sees `fanSpeed` in the data and sends `set_fan_speed` to HA. The `vacuumSpeed` value itself does reach the 3D component (line 585), but the issue is that the bridge also fires HA commands whenever the device state changes.

**File: `src/hooks/useHABridge.ts`** (lines 107-118)
- Add a guard: skip the `fanSpeed` service call if only `vacuumSpeed` or `showDustEffect` changed (these are 3D-only fields). Track previous state and compare — only send fan speed command when `fanSpeed` actually changed, not when unrelated fields change.

## 4. Error State Display

**Problem**: When the vacuum has an error (e.g., stuck), `errorMessage` from HA is parsed but not prominently shown in the UI.

**File: `src/components/home/cards/RobotPanel.tsx`**
- Add a prominent error banner at top of VacuumCard when `status === 'error'` or `errorMessage` is set. Red background, show the error text.

**File: `src/components/home/cards/DeviceControlCard.tsx`**
- Show error indicator in compact vacuum widget (red dot or text)

**File: `src/components/devices/DeviceMarkers3D.tsx`**
- When `status === 'error'`, flash the vacuum model red or show an exclamation mark sprite above it

## Summary of files to edit

| File | Changes |
|------|---------|
| `src/hooks/useHomeAssistant.ts` | Add verbose segment logging |
| `src/components/build/devices/VacuumMappingTools.tsx` | Show segmentId per zone |
| `src/components/home/cards/RobotPanel.tsx` | Fix stop→idle, error banner, keep speed slider |
| `src/components/home/cards/DeviceControlCard.tsx` | Fix stop→idle, error indicator |
| `src/hooks/useHABridge.ts` | Guard against 3D-only state changes triggering HA calls |
| `src/components/devices/DeviceMarkers3D.tsx` | Handle idle status, error visual |

