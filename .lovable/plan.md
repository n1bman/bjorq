

# Fix Spegeldörr: Thickness and Panel Flickering

## Problems
1. **Flickering panels** — Z-fighting: panel surfaces sit at exactly the same Z as the leaf surface (`panelRecess = leafThick/2 - 0.003 = 0.0195`, panel depth 0.006 → outer face at 0.0195+0.003 = 0.0225 = leafThick/2`). GPU can't decide which surface to render.
2. **Door too thick** — Currently 0.045m, user wants ~0.04m (standard Swedish interior door).

## Solution

### `src/lib/wallGeometry.tsx` (lines 352–407)

1. **`leafThick`**: Change from `0.045` to `0.04`
2. **Panel recess**: Change from `leafThick/2 - 0.003` to `leafThick/2 - 0.008` — panels clearly recessed ~8mm into the surface, no coplanar faces
3. **Panel depth**: Reduce from `0.006` to `0.004` — thinner panel boxes that sit fully inside the leaf volume
4. **Add `polygonOffset`** to leaf material as a safety net: `polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1`
5. **Add negative `polygonOffset`** to panel materials: `polygonOffsetFactor: -1` so panels always render in front of the leaf recess

This ensures panels are geometrically recessed and GPU depth-ordering is unambiguous.

