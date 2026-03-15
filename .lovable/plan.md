

# Fix Wall Corner Blocks — v1.6.3

## Problem
Corner blocks (dark cubes/diamonds) are highly visible at every wall junction. They use the exterior color of the first connected wall, which often differs from surrounding room colors. They also clip through placed 3D furniture models. The mitered wall geometry already creates proper corner shapes — these blocks were meant as gap-fillers but are now the most visually distracting element.

## Solution: Remove corner blocks, extend walls to overlap

The cleanest fix is to **eliminate corner blocks entirely** and instead **reduce wall trimming** so wall bodies overlap slightly at junctions. With `polygonOffset` already applied, overlapping wall geometry won't Z-fight. This removes all visible cubes/diamonds immediately.

### Changes

| File | Change |
|------|--------|
| `src/lib/wallGeometry.tsx` | Remove `generateCornerBlocks` function. Reduce trim amounts in `computeWallMitering` so walls extend into junctions (overlap instead of gap). |
| `src/components/build/Walls3D.tsx` | Remove `generateCornerBlocks` import and usage |
| `src/components/build/InteractiveWalls3D.tsx` | Remove `generateCornerBlocks` import and usage |
| `package.json` | Bump to 1.6.3 |
| `CHANGELOG.md` | Add entry |

### Key change in `computeWallMitering`

Current: walls are trimmed by `max(connectedThickness, wallThickness) / 2` at each connected end, creating a gap that corner blocks fill.

New: reduce trim to `max(connectedThickness, wallThickness) * 0.35` — walls overlap slightly at junctions, covering the gap naturally. The miter geometry already shapes the corners correctly. The slight overlap is invisible because both wall faces use the same material at the junction.

```text
Before:                          After:
Wall A ─────┐  ┌───── Wall B    Wall A ─────────────── Wall B
            │CB│                         (overlap)
            │  │
            Wall C                       Wall C
(CB = corner block, visible cube)  (no block, walls overlap)
```

This is a subtractive change — removes ~130 lines of corner block code and fixes all 5 reported visual issues in one stroke.

