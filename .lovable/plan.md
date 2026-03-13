

# Restore Full Import Dialog for Bibliotek

## Problem
The Bibliotek import dialog is a stripped-down version missing key features from the Inredning import dialog:
- No thumbnail preview
- No dimensions display
- No performance rating badge (ok/heavy/too-heavy)
- No warnings display
- No optimization recommendation panel (the colored box showing "Bra — redo att använda" / "Optimering rekommenderas")
- No subcategory field

## Solution
Rebuild the Bibliotek import dialog to match the Inredning dialog's structure (lines 855-925 of BuildModeV2.tsx), reusing the same visual layout:

1. **Thumbnail**: Show `bibImportResult.thumbnail` as a 96px centered image, with fallback placeholder
2. **Stats + dimensions line**: `formatStats` + dimensions string (e.g. `1.2×0.5×1.0m`)
3. **Performance rating icon**: CheckCircle/AlertTriangle based on `ratePerformance()`
4. **Warnings**: List any `bibImportResult.warnings`
5. **Optimization recommendation panel**: Colored box with level text from `getOptimizationLevel()`
6. **Multi-step flow**: Show analysis → optimize → optimized states identical to the Inredning dialog
7. **Subcategory field**: Add missing subcategory input

The existing `bibOptimize` logic and state variables are already in place — this is purely a UI template upgrade.

## File Changed
| File | Change |
|---|---|
| `src/components/build/BuildModeV2.tsx` | Replace the Bibliotek import dialog (lines ~1882-1926) with the full-featured layout matching the Inredning dialog |

