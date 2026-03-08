

# Plan: Fix reverse-cycle deduplication + healWalls grid snap

## Root cause

**Two bugs work together to prevent room detection when internal walls are removed.**

### Bug 1: Reverse cycle deduplication is broken (THE MAIN BUG)

For a simple rectangular room (nodes 0,1,2,3), the "turn right" algorithm finds TWO cycles — one CW and one CCW traversal of the same polygon:
- CW: `[0, 1, 2, 3]` — normalized key: `"0,1,2,3"`
- CCW: `[0, 3, 2, 1]` — normalized key: `"0,3,2,1"`

The code tries to detect reverse duplicates on line 104:
```text
revKey = [...normalized].reverse().join(',')
       = [3,2,1,0].join(',') = "3,2,1,0"
```

But the CCW cycle's key is `"0,3,2,1"` — NOT `"3,2,1,0"`. The reversed array is not re-normalized (rotated to start from the smallest element), so the duplicate check fails.

**Result:** Both CW and CCW cycles are kept. They have the same centroid and same polygon. The supercycle filter then sees that each contains the other's centroid and removes BOTH. Zero rooms detected.

This explains exactly the user's scenario: when internal walls are removed and one large enclosed area remains, the algorithm finds CW+CCW traversals, fails to deduplicate them, and the supercycle filter eliminates both.

**Fix:** Normalize the reversed array before comparison:
```typescript
const rev = [...normalized].reverse();
const revMinIdx = rev.indexOf(rev.reduce((a, b) => a < b ? a : b));
const revNormalized = [...rev.slice(revMinIdx), ...rev.slice(0, revMinIdx)];
const revKey = revNormalized.join(',');
```

### Bug 2: healWalls grid snap (still present from previous plan)

Lines 337-339 still snap centroids to the EPSILON grid via `Math.round(cx / EPSILON) * EPSILON`, which can push nearby points apart. Change to raw centroid `[cx, cy]`.

## Files changed

1. **`src/lib/roomDetection.ts`**
   - Fix `revKey` computation in `findMinimalCycles` (lines 104): normalize the reversed array before joining (~4 lines)
   - Fix `healWalls` grid snap (lines 337-340): use raw centroid instead of grid-quantized snap (~2 lines)
   - Add debug logging for cycle deduplication to track CW/CCW detection

