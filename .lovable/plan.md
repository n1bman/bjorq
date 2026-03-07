

# Fix Plan: Build Mode Functional Issues + Home View Regressions

## Issues Identified

### 1. Walls "half down" in home view
**Root cause**: `Walls3D.tsx` line 17 hardcodes `cutaway` mode for non-build modes, cutting all walls at 1.2m height. This was intended for overview, but the user sees it as broken.
**Fix**: Change home/dashboard default to `'up'` (full walls visible).

### 2. Floor clickable in home view
**Root cause**: `Scene3D.tsx` renders `Floors3D` which has `onPointerDown` handlers that call `setSelection()`. These should only be interactive in build mode. Additionally, `GroundPlane` in `Scene3D` calls `e.stopPropagation()` on every click, which captures interactions unnecessarily.
**Fix**: Make `Floors3D` and `GroundPlane` non-interactive when `appMode !== 'build'`.

### 3. Wall corners not meeting cleanly (image 3)
The mitering logic in `InteractiveWalls3D.tsx` works but `Walls3D.tsx` (used in home view) has no mitering at all — it renders raw overlapping boxes. The home view uses `Walls3D`, not `InteractiveWalls3D`.
**Fix**: Port the same mitering logic from `InteractiveWalls3D` into `Walls3D`.

### 4. Paint tool can't paint a selected wall
**Root cause**: `PaintCatalog` in `BuildCatalogRow.tsx` checks `selection.type === 'wall'` but the paint tool requires `activeTool === 'paint'`. When selecting a wall, the tool switches to `select`. Clicking paint then clears selection. The flow is broken.
**Fix**: Make paint tool preserve existing selection. When paint is active and user clicks a material, apply it to any currently selected wall/room. If nothing selected, show a toast "Select a wall or room first". Also: allow clicking walls/rooms while paint tool is active (not just select tool).

### 5. "HT Bygge" banner takes up space
**Root cause**: `BuildTopToolbar.tsx` doesn't show a banner itself, but the parent page might. Looking at the screenshots, the top bar shows "HT Bygge Redigera planläsning" — this comes from a header element.
**Fix**: The toolbar is already clean per the code. Need to check if there's an outer wrapper adding this. Based on screenshots this is the `BuildTopToolbar` itself with the back button area. Actually looking closer, this seems to be from the page/app shell. Will check `Index.tsx` or parent.

### 6. Devices/3D models invisible inside built environment
Devices placed at coordinates inside walls may have incorrect Y positions or be occluded. Props placed at `[0,0,0]` default may be at ground level below the floor mesh.
**Fix**: Ensure props get placed at floor elevation, not at Y=0.

### 7. Center indicator when building
**Fix**: Add a small crosshair indicator at world origin `[0,0,0]` in build mode.

### 8. Missing device categories (image 4 shows old UI had more)
The current `DeviceCatalog` in `BuildCatalogRow.tsx` has 10 devices. The old sidebar had more device types and subcategories.
**Fix**: Add missing devices: `place-alarm`, `place-soundbar`, `place-cover`, `place-power-outlet`, `place-garage-door`, `place-lawn-mower`. Group into subcategories.

### 9. Import tool blocks 3D interaction
When import tool is active, clicking 3D canvas does nothing because `handleGroundPointerDown` only handles specific tools. User expects to still orbit/interact.
**Fix**: When clicking ground with a non-placement tool (like `import` or `furnish`), auto-switch to `select` tool so orbit works naturally. Or simply don't block orbit for these tools.

### 10. Keyboard shortcuts popup
**Fix**: Add a help button (? icon) in top toolbar that shows a modal with shortcuts.

## File Changes

| File | Changes |
|------|---------|
| `Walls3D.tsx` | Default to `'up'` in home mode; add mitering logic |
| `Floors3D.tsx` | Skip click handlers when not in build mode |
| `Scene3D.tsx` | Pass no-op handlers to GroundPlane only in non-build modes |
| `BuildCatalogRow.tsx` | Paint: allow wall/room clicks; add missing device types with subcategories |
| `InteractiveWalls3D.tsx` | Allow wall/room selection when paint tool active |
| `BuildTopToolbar.tsx` | Remove banner text; add keyboard shortcut help button |
| `BuildScene3D.tsx` | Add origin crosshair; auto-deselect non-placement tools on ground click |
| `BuildBottomDock.tsx` | Auto-switch to select when clicking non-catalog tools while on canvas |

## Priority Order
1. Fix home view walls (cutaway → up) and floor click blocking — immediate visual regression
2. Wall mitering in `Walls3D.tsx` (home view corners)
3. Paint tool wall selection flow
4. Remove banner, add center indicator
5. Fix prop/device placement Y coordinate
6. Add missing device categories
7. Auto-switch tool flow improvement
8. Keyboard shortcuts popup

