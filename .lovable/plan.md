

# Fix Vacuum Room Cleaning via HA + Zone Label Positioning

## What you're seeing

The screenshot shows `sensor.s5_max_nuvarande_rum` with an `options` attribute listing Roborock's room names (Tvrummet, Köket, G3, etc.). These are **room names**, not segment IDs. Roborock's `app_segment_clean` command requires **integer segment IDs** (e.g. 16, 17, 18), which aren't directly visible in HA Developer Tools.

However, there's a better approach: we can auto-discover segment IDs by sending `get_room_mapping` to the vacuum, OR we can match zone names to the sensor's room names and send cleaning commands using the room name approach that some Roborock integrations support.

## Plan

### 1. Auto-populate room names from HA sensor (`VacuumMappingTools.tsx`)
- Read `sensor.s5_max_nuvarande_rum` entity's `options` attribute from HA entities
- Show these as selectable room names when naming zones (instead of only floor rooms)
- This ensures zone names match Roborock's internal room names exactly

### 2. Add "Discover Segments" button (`VacuumMappingTools.tsx` + `useHABridge.ts`)
- Add a button that calls `vacuum.send_command` with `command: 'get_room_mapping'` to retrieve room-to-segment mappings
- Parse the response and auto-fill segment IDs for matching zones
- Keep the manual segment ID input as fallback, with clearer help text: "Hitta i Roborock-appen eller via get_room_mapping"

### 3. Fix room cleaning command (`useHABridge.ts`)
- Current code correctly sends `app_segment_clean` with `params: [segmentId]` when segmentId exists
- Add alternative: if no segmentId but zone name matches an HA room name, try `vacuum.send_command` with `command: 'app_segment_clean'` and `params: {"segments": [segmentId]}`
- Hardcode the sensor entity pattern (`sensor.*_nuvarande_rum` or use vacuum marker's linked entity) to dynamically find the room sensor

### 4. Fix zone label text positioning (`BuildCanvas2D.tsx`, `RobotPanel.tsx`)
- When rendering zone labels, compute the visual center using `pointInPolygon` check
- If centroid falls outside polygon, use the closest edge midpoint that IS inside
- Ensure text is properly centered within the polygon area

### 5. Make `useVacuumRoomSync` dynamic (`useHABridge.ts`)
- Currently hardcoded to `sensor.s5_max_nuvarande_rum`
- Instead, auto-discover the room sensor by looking for entities matching `sensor.*nuvarande_rum` or `sensor.*current_room` in the HA entities list
- This makes it work with any Roborock model

## Files to change

| File | Change |
|------|--------|
| `src/components/build/devices/VacuumMappingTools.tsx` | Auto-populate room names from HA sensor options, improve segment ID UX |
| `src/hooks/useHABridge.ts` | Dynamic room sensor discovery, segment discovery helper |
| `src/components/build/BuildCanvas2D.tsx` | Fix zone label centering inside polygon |
| `src/components/home/cards/RobotPanel.tsx` | Fix mini-map label centering |

