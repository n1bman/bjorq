

# Fix Vacuum Room Switching, 3D Movement, Widgets, and Fan Speed Sync

## Issues to fix

1. **Room switching hangs** — When switching from one room to another during cleaning, the state update doesn't properly reset/transition
2. **3D movement too fast** — Speed is 0.2 m/s but moves unrealistically; needs systematic pattern
3. **3D model escapes zones** — Robot flies through walls between rooms instead of staying in zone
4. **Room buttons in home widget** — DeviceControlCard vacuum widget needs room cleaning buttons (already exists but may not show in home widget)
5. **RobotPanel UI improvements** — Add "Städa alla rum", cleaning log/history per room
6. **Fan speed not synced** — `fan_speed` in HA is a string preset name (e.g. "gentle", "balanced"), not a number 0-100
7. **Roborock-only notice** — Show disclaimer that room mapping only works with Roborock

## Changes by file

### `src/hooks/useHABridge.ts` (lines 96-148)
- **Fix #1**: When `targetRoom` changes, first send `vacuum.stop` or `vacuum.pause` before sending new `app_segment_clean` — Roborock requires stopping current task before starting a new segment clean
- **Fix #6**: Change `set_fan_speed` to send the preset **name** string (e.g. "gentle") not a percentage number. Map percentage ranges to preset names from `fanSpeedList`

### `src/lib/haMapping.ts` (lines 83-108)
- **Fix #6**: Parse `fan_speed` as string preset name from HA, map it to the percentage using `fanSpeedList` index. Store both the numeric percentage and the active preset name in state

### `src/store/types.ts` (VacuumState ~274-288)
- Add `fanSpeedPreset?: string` to store the active HA preset name (e.g. "gentle", "balanced", "turbo")
- Add `cleaningLog?: Array<{ room: string; startedAt: string; duration?: number; fanPreset?: string }>` for per-room history

### `src/components/devices/DeviceMarkers3D.tsx` (lines 517-579)
- **Fix #2**: Reduce speed from 0.2 to ~0.04 m/s for realistic vacuum movement
- **Fix #3**: Add systematic back-and-forth pattern within zone polygon instead of random wandering. Use a stripe/lawnmower pattern: pick parallel lines across the polygon, move along each, only go outside zone boundary when transitioning rooms (straight line to new zone centroid)
- **Fix #3**: When room changes, move in a straight line toward new zone centroid (not teleport), clamped to floor Y. During transition, ignore zone boundary constraint
- **Fix #2**: Remove the sine-wave wobble, use cleaner movement

### `src/components/home/cards/RobotPanel.tsx`
- **Fix #5**: Add "Städa alla rum" button that queues all zones sequentially
- **Fix #5**: Add cleaning log section showing last cleaned rooms with timestamps, duration, and fan preset
- **Fix #6**: Show active fan preset name instead of just percentage
- **Fix #7**: Add notice below robot header: "⚠ Rumsstyrning fungerar just nu bara för Roborock-modeller"

### `src/components/home/cards/DeviceControlCard.tsx` (lines 417-500)
- **Fix #4**: Ensure room cleaning buttons are visible in the home widget (they exist but verify they render in compact mode)
- **Fix #6**: Send fan speed preset name, show preset label
- **Fix #7**: Add Roborock-only notice

### `src/store/useAppStore.ts`
- Add `addCleaningLogEntry` action to push entries to the vacuum's cleaning log
- Trigger log entry when room cleaning starts and update duration when it ends

