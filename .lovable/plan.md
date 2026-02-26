

# Auto-discover Roborock Segment IDs via `roborock.get_maps`

## Changes

### 1. Add `vacuumSegmentMap` to store (`types.ts` + `useAppStore.ts`)
- Add `vacuumSegmentMap: Record<string, number>` to `HomeAssistantState` (e.g. `{ "Tvrummet": 16, "Köket": 17 }`)
- Add `setVacuumSegmentMap` action
- Initialize as `{}`

### 2. Call `roborock.get_maps` on HA connect (`useHomeAssistant.ts`)
- After `auth_ok` + states loaded, find the vacuum entity (domain `vacuum`)
- Send WebSocket call:
  ```json
  { "type": "call_service", "domain": "roborock", "service": "get_maps",
    "target": { "entity_id": "vacuum.s5_max" },
    "service_data": {}, "id": N, "return_response": true }
  ```
- Track this message ID; in the `result` handler, parse `response.maps[0].rooms` to extract `{ roomName: segmentId }` mapping
- Call `setVacuumSegmentMap(mapping)`
- Auto-discover vacuum entity ID from HA entities instead of hardcoding

### 3. Use segment map in bridge (`useHABridge.ts`, lines 112-127)
- When `targetRoom` is set, look up `state.homeAssistant.vacuumSegmentMap[data.targetRoom]` first
- Fall back to zone's manual `segmentId`
- Never fall back to `vacuum.start` if either source has a segment ID
- Only use `vacuum.start` as absolute last resort

### 4. Show target room in RobotPanel status (`RobotPanel.tsx`)
- When cleaning with `targetRoom`, show "Städar · Köket" instead of just "Städar"

### 5. Show auto-discovered IDs in VacuumMappingTools (`VacuumMappingTools.tsx`)
- Read `vacuumSegmentMap` from store
- Display discovered segment ID next to zone name (e.g. "Segment: 16 (auto)")
- Manual input remains as override

## Files

| File | Change |
|------|--------|
| `src/store/types.ts` | Add `vacuumSegmentMap` to `HomeAssistantState`, add `setVacuumSegmentMap` action |
| `src/store/useAppStore.ts` | Implement `setVacuumSegmentMap`, init `vacuumSegmentMap: {}` |
| `src/hooks/useHomeAssistant.ts` | Call `roborock.get_maps` after auth, parse response, store mapping |
| `src/hooks/useHABridge.ts` | Look up segmentId from `vacuumSegmentMap`, never fallback to `vacuum.start` |
| `src/components/home/cards/RobotPanel.tsx` | Show "Städar · {room}" |
| `src/components/build/devices/VacuumMappingTools.tsx` | Display auto-discovered segment IDs |

