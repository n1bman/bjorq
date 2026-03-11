

# Fix Wizard/Möbler Separation + Import Dialog + Categories

## Problem

1. Wizard models appear in both "Möbler" and "Wizard" tabs — should only appear in Wizard
2. Clicking a Wizard model auto-imports without asking — should show the import dialog (like file import, image 3) so user can choose name/category
3. No standardized categories — need sensible defaults
4. Console errors: `preventDefault inside passive event listener` — harmless Three.js/OrbitControls issue, no fix needed

## Changes

### 1. Hide Wizard entries from Möbler tab

In `allEntries` filtering (line ~254), when `sourceFilter` is `'all'` or `'user'` or `'curated'`, exclude entries with `source === 'wizard'` that don't have a `catalogItem` (i.e. not yet imported). Already-imported wizard models (which have `wizardMode === 'imported'`) show as `source: 'user'` and will remain visible in Möbler.

### 2. Wizard click → Import dialog

Instead of `handleWizardImport` auto-downloading and placing, clicking a Wizard entry opens the same import dialog used for file imports. The flow:

1. Click wizard entry → download model blob in background
2. Run through `processModel()` pipeline (same as file import)
3. Show the import dialog with thumbnail, stats, name, category selector, optimize option
4. On confirm → save to catalog as `wizardMode: 'imported'` and place

This reuses the existing `importDialogOpen` / `importResult` / `handleImportConfirm` state and dialog.

### 3. Better default categories

Update `AssetCategory` type and `AC_CATEGORY_LABELS` to include more useful defaults:

| Key | Swedish Label |
|-----|--------------|
| sofas | Soffor |
| chairs | Stolar |
| tables | Bord |
| beds | Sängar |
| storage | Förvaring |
| lighting | Belysning |
| decor | Dekoration |
| plants | Växter |
| kitchen | Kök |
| bathroom | Badrum |
| outdoor | Utomhus |
| electronics | Elektronik |
| smart-devices | Smarta enheter |
| imported | Importerade |

### 4. Pre-fill category from Wizard metadata

When opening the import dialog for a Wizard asset, map `wizardMeta.category` to the closest local `AssetCategory` if possible. Fallback to `'imported'`.

## Files Changed

| File | Change |
|------|--------|
| `src/components/build/BuildModeV2.tsx` | Filter wizard from non-wizard views, rework wizard click to open import dialog, update category labels |
| `src/store/types.ts` | Add `electronics` and `smart-devices` to `AssetCategory` |

## Console Errors

The `Unable to preventDefault inside passive event listener` warnings come from Three.js OrbitControls touch handling — this is a known upstream issue and does not affect functionality. No fix needed.

