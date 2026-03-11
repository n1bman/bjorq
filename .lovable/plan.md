

# Add Wizard Library Button to Bottom Dock

## Problem
The Wizard library is currently hidden inside the Möbler panel's source filter. Hard to find, especially in dev where you can't sync. The user wants a dedicated dock button between Möbler and Enheter.

## Solution

Add a new dock item "Wizard" (with `Wand2` icon) between Möbler and Enheter in `BuildBottomDock`. When clicked, it opens the same `AssetCatalog` side panel but with `sourceFilter` pre-set to `'wizard'`.

### Changes in `src/components/build/BuildModeV2.tsx`

1. **Add `'wizard'` as a pseudo-tool** in `dockItems` array (line ~1259), between `furnish` and `place-light`:
   ```
   { tool: 'wizard' as BuildTool, tab: 'furnish', label: 'Wizard', icon: Wand2, hasCatalog: true },
   ```

2. **Update `showFurnishPanel` condition** (line ~1301) to also show the panel when tool is `'wizard'`:
   ```
   const showFurnishPanel = activeTool === ('furnish' as any) || activeTool === ('wizard' as any);
   ```

3. **Pass initial source filter to `AssetCatalog`**: Add a prop `initialSourceFilter` so when opened via Wizard dock button, the source filter defaults to `'wizard'`. When opened via Möbler, it defaults to `'all'`.

4. **Update `AssetCatalog`** to accept `initialSourceFilter` prop and use it as the default for `sourceFilter` state. Reset when prop changes.

5. **Update active detection** in `BuildBottomDock` (line ~1274) to highlight the Wizard button.

6. **Show Wizard connection status** in the panel when source filter is `'wizard'` — if not connected, show the Wizard URL config inline so the user can connect without leaving build mode.

### Files changed

| File | Change |
|------|--------|
| `src/components/build/BuildModeV2.tsx` | Add wizard dock item, pass source filter prop to AssetCatalog, update panel visibility logic |

