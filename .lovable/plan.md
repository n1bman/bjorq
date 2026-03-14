

# Fix Wall Position + Redesign Diagonal Frost to 6-Pane Window

## Problem 1: Walls showing only half
The wall body mesh is positioned at `Y = elevation` (line 751), but the geometry is centered at Y=0 (extends from `-wallHeight/2` to `+wallHeight/2`). This means half the wall sits below the ground plane.

**Fix**: Change position Y to `wallHeight / 2 + elevation`.

**File**: `src/lib/wallGeometry.tsx` line 751

## Problem 2: "Frostat diagonalt" needs 6 panes
The current 4-pane diagonal frost looks wrong. Based on the annotated reference image (image-248), the user wants a **6-pane** layout (3 rows × 2 columns) where the **two middle panes are frosted**:

```text
┌───────┬───────┐
│ clear │ clear │  top row (~30%)
├───────┼───────┤
│frosted│frosted│  middle row (~35%)
├───────┼───────┤
│ clear │ clear │  bottom row (~35%)
└───────┴───────┘
```

**Changes**:
- In `openingPresets.ts`: rename label to `"6-rutors frostat mitt"`, change style to `'6pane-frost-mid'`
- In `wallGeometry.tsx`: add a new `is6Pane` branch that renders 6 glass panes (3×2 grid) with two horizontal rails and one vertical mullion. The two middle panes get frosted material, the four outer panes get clear glass. Proportions: top ~30%, middle ~35%, bottom ~35%.

### Files
- `src/lib/wallGeometry.tsx` — fix wall Y position + add 6-pane rendering
- `src/lib/openingPresets.ts` — update the diagonal preset to 6-pane

