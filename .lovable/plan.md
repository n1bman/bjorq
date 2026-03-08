

# Plan: Fix room state reuse causing incorrect naming after wall changes

## Problem

When walls are removed and rooms merge, the new large room inherits a previous small room's name (e.g., "Rum 4") instead of getting a fresh name like "Rum 1". This is caused by the overlap-matching logic in `detectRooms`.

## Root cause

`detectRooms` receives `existingRooms` (line 1627 in useAppStore.ts) and tries to match new polygons to old rooms via `polygonOverlap`. The overlap function uses `Math.min(areaA, areaB)` as denominator — so a small old room whose bounding box is entirely within the new large merged room scores overlap = 1.0 (100%). The first old room to match "wins" and its name/ID is reused.

```text
Old: "Rum 4" (small kitchen, 8m²)    New: one large room (60m²)
BBox overlap = 8/8 = 1.0 > 0.6 threshold → MATCH
Result: large room inherits "Rum 4" name
```

The `usedNumbers` set then reserves numbers from ALL existing rooms, causing further naming gaps.

## Fix

### 1. Add area-ratio guard to overlap matching (`src/lib/roomDetection.ts`, ~3 lines)

Only accept an overlap match if the area ratio between old and new polygon is within 3x. This prevents a 60m² merged room from matching an 8m² old room while still allowing rooms that shift slightly (area changes <3x) to preserve their metadata.

```typescript
// In the overlap matching block (line 503-504)
const areaRatio = Math.max(area, polygonArea(er.polygon)) / 
                  Math.min(area, polygonArea(er.polygon));
if (overlap > 0.6 && overlap > bestOverlap && areaRatio < 3) {
```

### 2. Only collect used numbers from matched rooms, not all existing rooms (`src/lib/roomDetection.ts`, ~10 lines)

Move the `usedNumbers` collection to AFTER matching is determined, so unmatched old room names don't block fresh numbering. This ensures "Rum 1" is available when no old room matched.

## Files changed

1. **`src/lib/roomDetection.ts`** — Add area-ratio guard + fix usedNumbers logic

