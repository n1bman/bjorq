

# Plan: Fix room detection + fix inside/outside material sides

## Two separate bugs

### Bug 1: `splitAtTJunctions` deduplication merges T-junctions too aggressively

In `roomDetection.ts` line 230-231, the deduplication of split points uses `EPSILON` (0.15) directly in **t-space** (0-1). For a 5m wall, two T-junctions 0.5m apart have `Δt = 0.1`, which is less than 0.15, so one gets dropped. The wall doesn't split properly, the graph is incomplete, and rooms can't be detected.

**Fix**: Convert the dedup threshold to distance-based:
```typescript
const wallLen = Math.sqrt(
  (wall.to[0] - wall.from[0]) ** 2 + (wall.to[1] - wall.from[1]) ** 2
);
const tDedup = EPSILON / wallLen;
// line 231:
if (splits[i] - unique[unique.length - 1] > tDedup) unique.push(splits[i]);
```

### Bug 2: Interior/exterior material side is inverted

In `setRoomMaterial` (useAppStore.ts line 648-676), the signed area formula determines polygon winding. The current logic:
```
signedArea += (poly[j][0] - poly[i][0]) * (poly[j][1] + poly[i][1]);
const isCW = signedArea > 0;
const interiorIsLeft = wallMatchesPolyDir ? isCW : !isCW;
```

The `findMinimalCycles` algorithm uses "turn right" (smallest CCW angle), which in our coordinate system (X right, Z down in 2D) produces **CW** cycles. In this system, the interior is to the **RIGHT** of the traversal direction, not left. The logic is inverted.

**Fix**: Flip the boolean:
```typescript
const interiorIsLeft = wallMatchesPolyDir ? !isCW : isCW;
```

## Files changed

1. **`src/lib/roomDetection.ts`** — Fix dedup threshold in `splitAtTJunctions` (convert t-space to distance-based, ~3 lines)
2. **`src/store/useAppStore.ts`** — Flip interior side logic in `setRoomMaterial` (1 line)

