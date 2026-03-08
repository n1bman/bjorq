

# Plan: Fix room detection — split points must use actual endpoint coordinates

## Root cause

The core bug is in `splitAtTJunctions` (roomDetection.ts lines 238-244). When a wall endpoint `ep` is detected near another wall, the wall is split at the **projected point** (the closest point on the wall line to `ep`), NOT at `ep` itself:

```text
ep = (1.0, 0.08)       ← actual endpoint of inner wall
projected = (1.0, 0.0)  ← closest point on outer wall

keyFor(ep)        = "7,1"   ← grid cell
keyFor(projected) = "7,0"   ← DIFFERENT grid cell!
```

The split point and the actual endpoint land in different `keyFor` grid cells (EPSILON=0.15m grid). The graph never connects them, so the cycle finder can't form a closed loop for that room.

The `addWall` function in the store (line 457) does this correctly — it uses `[ep[0], ep[1]]` as the split point. But `splitAtTJunctions` uses the projected point.

## Fix

**`src/lib/roomDetection.ts`** — Change `splits` from storing `t` values to storing `{t, point}` objects where `point` is the actual endpoint `ep`. When creating sub-segments, use `ep` coordinates instead of the projected position.

Changes:
1. Change `splits` array type from `number[]` to `{t: number, point: [number, number]}[]`
2. Push `{t, point: [ep[0], ep[1]]}` instead of just `t`
3. Sort/dedup by `.t`
4. Use `.point` when building the split sub-segments instead of computing `from + t * (to - from)`

This ensures the split point in the new wall segments is exactly the same coordinate as the endpoint of the connecting wall, so `keyFor` produces the same key and the graph connects them.

## Also: Add debug logging

Add a `console.log` in `detectRooms` that reports: number of walls after heal, after split, graph node count, and cycles found. This will help diagnose future issues without guessing.

## Files changed

1. **`src/lib/roomDetection.ts`** — Fix split point coordinates + add debug log (~15 lines changed)

## Material side issue

The material side fix from the previous change (flipping `interiorIsLeft`) should be correct. Once rooms are properly detected with accurate polygons, the winding-based side calculation will work. The user's current issue is likely caused by incorrect room polygons (from the split bug), which cascade into wrong winding detection.

