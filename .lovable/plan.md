

# Fix 4-Pane Window Issues

## Problems
1. **Dimensions swapped** — Presets have `width: 1.4, height: 1.0` (landscape), but user wants `width: 1.0, height: 1.4` (portrait/taller than wide, classic Swedish tvåluft).
2. **Diagonal frost variant looks broken** — The `4pane-frost-diag` pattern (TL+BR frosted) creates visual confusion where frosted panes blend with the frame. User wants "frost i mitten" instead.

## Changes

### 1. `src/lib/openingPresets.ts` — Swap width/height on all three 4-pane presets
```
width: 1.0, height: 1.4  (was width: 1.4, height: 1.0)
```
Update descriptions to match: `100×140 cm`.

### 2. `src/lib/openingPresets.ts` + `src/lib/wallGeometry.tsx` — Replace diagonal variant
- Rename `4pane-frost-diag` to `4pane-frost-mid` with label "4-rutors frostat mitt"
- Change frosting pattern from `[true, false, false, true]` (TL+BR diagonal) to `[false, true, true, false]` (TR+BL — the two inner panes closest to the center cross, creating a frosted "middle band")

### 3. Wall error
The "An error occurred" toast in the screenshot appears to be a transient runtime issue (console shows only forwardRef warnings, no crashes). Wall geometry code is intact. No code change needed.

## Files
- `src/lib/openingPresets.ts` — swap dimensions, rename diag→mitt
- `src/lib/wallGeometry.tsx` — update frost pattern for `4pane-frost-mid`

