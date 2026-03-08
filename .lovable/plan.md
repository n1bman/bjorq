

# Plan: Fix missed kitchen cycle — handle node revisits in cycle tracer

## Analysis from console logs

With 20 nodes and 25 edges (after split), Euler's formula gives **F = E - V + 2 = 7 faces** (including outer face). So there should be **6 interior faces**. The algorithm finds only **5 cycles**. One face (the kitchen) is consistently missed.

## Root cause: node revisit in cycle tracing

The "turn right" cycle tracer does NOT detect when it revisits a node already in the path (other than the start node). In graphs with **cut vertices** (nodes whose removal disconnects the graph — common in apartment layouts where a single corner node connects two room boundaries), the trace can cross through a cut vertex, trace around one face, return to the cut vertex, and continue tracing another face. The result is a single large path that encompasses TWO faces.

```text
Correct: face A = [1,2,3,4,1]  face B = [4,5,6,7,4]
Bug:     trace from 1 = [1,2,3,4,5,6,7,4,... continues around face A]
         Node 4 is visited TWICE — but the algorithm doesn't notice.
         The resulting "cycle" merges two faces into one non-minimal cycle.
         The supercycle filter then removes it (another cycle's centroid is inside).
         Both faces are lost.
```

## Fix

### 1. Add revisit detection in `findMinimalCycles` (`src/lib/roomDetection.ts`)

When `current` is already in `path` (but is not `startKey`), extract the sub-cycle from the first occurrence of `current` to the current position. Record this as a valid cycle and mark its edges as used. Then continue tracing from the revisited node to find the remaining face.

This is the standard fix for the planar face enumeration algorithm on non-2-connected graphs.

### 2. Add comprehensive debug logging

Log all cycles found (with coordinates), which are filtered as supercycles, and which are rejected by area. This makes any future issues trivially debuggable.

## Files changed

1. **`src/lib/roomDetection.ts`** — Add revisit detection in cycle tracer + debug logging (~25 lines)

