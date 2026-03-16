

# Fix: Padding only for L-corners, skip T-junctions

## Problem
Images 1-2 show L-corners are nearly perfect now. Images 3-4 show the perpendicular wall at T-junctions sticking out slightly past the through-wall. This is because the `+0.005` padding is applied to ALL mitered endpoints, including T-junctions where the through-wall already provides full coverage — the extra padding pushes the perpendicular wall slightly beyond the through-wall surface.

## Solution
Track the number of candidates (connected walls) at each endpoint. Apply padding only when `candidates.length === 1` (L-corner). When `candidates.length >= 2` (T-junction or cross), skip padding — the through-wall already covers the seam.

## Change

### `src/lib/wallGeometry.tsx` — `computeMiterOffsets` (lines 193-209)

Store whether each end is an L-corner, then conditionally apply padding:

```typescript
// After line 188 (useOffset clamping), before applying to result:
const isLCorner = candidates.length === 1;

if (end === 'from') {
  result.fromLeft = useOffset;
  result.fromRight = -useOffset;
  fromIsL = isLCorner;  // track for padding
} else {
  result.toLeft = -useOffset;
  result.toRight = useOffset;
  toIsL = isLCorner;
}

// Then in padding section:
const pad = 0.005;
if (fromIsL) {
  if (result.fromLeft  !== 0) result.fromLeft  -= pad;
  if (result.fromRight !== 0) result.fromRight -= pad;
}
if (toIsL) {
  if (result.toLeft  !== 0) result.toLeft  += pad;
  if (result.toRight !== 0) result.toRight += pad;
}
```

One file, ~8 lines changed. L-corners keep their overlap fix, T-junctions stay flush.

