

# Plan: Fix room detection — T-junction split bug

## Root Cause

In `splitAtTJunctions` (roomDetection.ts line 209), the `t` parameter threshold uses `EPSILON` (0.15) directly:
```
if (t <= EPSILON || t >= 1 - EPSILON) continue;  // t <= 0.15 || t >= 0.85
```

But `t` is a normalized 0–1 parameter along the wall, NOT a distance in meters. This means **the first and last 15% of every wall are excluded from T-junction detection**. For a 5m wall, that's 0.75m from each end being ignored — so inner walls connecting near corners of outer walls are never split, and the graph never forms closed cycles for those rooms.

The store's `addWall` auto-split correctly uses `t <= 0.02 || t >= 0.98`, but `splitAtTJunctions` (which runs during `detectRooms`) has this bug, meaning any T-junctions that weren't caught at wall-add time are still missed.

## Fix

**`src/lib/roomDetection.ts`** — line 209: Convert the `t` threshold to be distance-based:

```typescript
const wallLen = Math.sqrt(len2);
const tEps = EPSILON / wallLen;
if (t <= tEps || t >= 1 - tEps) continue;
```

This ensures we only skip split points within 0.15m (actual distance) of a wall endpoint, regardless of wall length. A 10m wall now correctly allows splits at 2% from the end instead of ignoring the first 15%.

## Files Changed

1. **`src/lib/roomDetection.ts`** — Fix `t` threshold in `splitAtTJunctions` (1 line change)

