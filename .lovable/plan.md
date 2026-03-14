

# Fix Spegeldörr: Recessed Panels, Both Sides, Selectable

## Issues from Screenshots
1. **Panels stick outward** — `panelZ` is positive, pushing panels out. Real spegeldörr has recessed (inlaid) panels flush or slightly below the door surface
2. **Weird arch shape above door** — the half-cylinder is too large and positioned oddly
3. **Panels only on one side** — need mirrored panels on the back face
4. **Not selectable** — panel sub-meshes missing `{...openingPointer}`

## Changes — `src/lib/wallGeometry.tsx` (lines 352–465)

### 1. Recess panels instead of protruding
Change panel rendering approach: instead of placing panels *on top* of the leaf, make the leaf thicker (0.045m) and place panels as shallow depressions. Practically: keep the leaf as-is, but move `panelZ` to a *negative* offset (into the surface, not out). The panels become thin box meshes at `Z = -(leafThick/2 - 0.003)` — slightly recessed into the leaf face.

Both panel faces: render each panel twice — once at `+panelZ` and once at `-panelZ` for front and back.

### 2. Fix arch — replace with subtle curved molding
Remove the large half-cylinder. Replace with a thin decorative arc using a torus segment (or simply skip it and use a flat panel — the arch is barely visible at dashboard scale). Simplest: remove the arch mesh entirely and make the top panel slightly taller. A flat top panel is authentic for many Swedish spegeldörrar.

### 3. Add `{...openingPointer}` to all panel meshes
Update the `panelMesh` helper to include `{...openingPointer}` and add emissive selection props.

### 4. Door thickness
Increase `leafThick` from 0.04 to 0.045m to accommodate recessed panels on both sides.

### Summary of mesh changes
- `panelMesh` helper: add `{...openingPointer}`, emissive props, render at both `+Z` and `-Z`
- Remove arch cylinder mesh
- `panelZ` becomes negative (recessed)
- `leafThick` → 0.045
- Handle and keyhole stay as-is (only on one side, which is correct)

