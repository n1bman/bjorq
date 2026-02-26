

# Auto-Apply Segment IDs from `roborock.get_maps` + Fallback Notice

## Problem
The `roborock.get_maps` response contains room names paired with segment IDs (stored in `vacuumSegmentMap`), but the fuzzy name matching between zone `roomId`/display names and HA room names often fails. Users must manually enter segment IDs for rooms like "Tvrummet". The data IS available — it just isn't reliably connected.

## Approach
Two changes:
1. **Show segment map as a picker** — Instead of only fuzzy-matching, let the user link each zone to an HA room from the discovered segment map via a dropdown. Auto-select if fuzzy match works, but always let user pick manually.
2. **Fallback notice** — If no `vacuumSegmentMap` entries exist (HA not connected or `get_maps` failed), show a note explaining that segment IDs must be entered manually.

## Changes

### `src/components/build/devices/VacuumMappingTools.tsx`
- Replace the segment ID section per zone (lines 187-220): instead of showing a number input OR "auto" text, show a **dropdown/select** populated from `vacuumSegmentMap` entries (e.g. "Tvrummet → #16", "Köket → #18"). Pre-select if there's a fuzzy match or existing `segmentId`. On change, call `updateVacuumZoneSegmentId`.
- If `vacuumSegmentMap` is empty, show the manual number input as fallback + a notice: "Anslut till HA och kör roborock.get_maps för att hämta segment-ID automatiskt."

### `src/components/home/cards/RobotPanel.tsx`
- In `RoomZoneCards`, next to each zone button, show a small warning icon if the zone has no `segmentId` set, with tooltip "Saknar segment-ID — rumsstyrning fungerar ej."
- When clicking a zone without `segmentId`, show a toast warning instead of silently failing.

### `src/hooks/useHABridge.ts`
- At line 170, when `segId` is undefined, fire a toast/console warning with actionable message instead of just `console.warn`.

