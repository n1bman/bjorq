

## Asset Catalog UI Integration

### Problem
The rich `AssetCatalog` component (thumbnails, categories, source badges, management) exists but is **never rendered**. `FurnishTools` imports it but `FurnishTools` itself is never imported anywhere. Instead, `BuildModeV2.tsx` has an old inline `FurnishCatalog` (lines 85-157) that shows basic chips with Box icons in a horizontal bottom row — no thumbnails, no categories, no curated catalog loading.

### Solution
Replace the old `FurnishCatalog` with the rich `AssetCatalog` as a **side panel** (same pattern as the device placement panel), and show a proper empty state when no assets exist.

### Changes

**`src/components/build/BuildModeV2.tsx`**

1. **Add furnish side panel** (like the device panel pattern at line 636-639): When `activeTool === 'furnish'`, show a left side panel (w-[260px]) containing `AssetCatalog` imported from `./furnish/AssetCatalog`. This replaces the bottom catalog row for furniture.

2. **Remove old `FurnishCatalog`** function (lines 85-157) — it's fully superseded.

3. **Update `BuildCatalogRow`** (line 551-563): Remove the `furnish` case from `showCatalog` and from the rendering logic. Furniture now lives in the side panel, not the bottom row.

4. **Update main layout** (lines 626-648): Add `showFurnishPanel` condition alongside `showDevicePanel` and `showImportPanel`, rendering the side panel with `AssetCatalog`.

**`src/components/build/furnish/AssetCatalog.tsx`**

5. **Improve empty state** (around line 538): Replace the sparse one-liner with a proper empty state card showing an icon, explanatory text ("Inga möbler i katalogen ännu"), and action buttons for upload/import.

6. **Increase grid scroll height**: Change `max-h-64` to `max-h-[60vh]` since it now lives in a side panel instead of a bottom row — more vertical space available.

7. **Add import quality warnings**: In the import dialog stats section, add explicit warnings for mobile/Raspberry Pi when triangle count > 50k or file size > 5MB.

8. **Add placement type indicator**: Show floor/wall/ceiling placement info on catalog cards when available.

### Files modified
- `src/components/build/BuildModeV2.tsx` — remove old FurnishCatalog, add side panel with AssetCatalog
- `src/components/build/furnish/AssetCatalog.tsx` — better empty state, taller grid, quality warnings

No new files or dependencies needed.

