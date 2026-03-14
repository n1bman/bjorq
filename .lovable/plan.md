

# Correction Plan — 3 Issues

## Issue 1: Home layout — widgets should also appear below the 3D view, and toolbar buttons on same row

**Current:** `DashboardShell.tsx` uses a two-column grid (`grid-cols-[minmax(300px,2fr)_3fr]`) where 3D is left column and widgets are right column. Nothing renders below the 3D view. The "Redigera" / "Hantera kategorier" / "Klar" buttons are in a separate `flex justify-end` row above the grid.

**Fix:**
- Change the Home layout from a strict 2-column grid to a more flexible approach: 3D preview and widget area sit in a top row, then widgets can continue below spanning full width.
- Technically: wrap 3D + first widget column in a flex row, then let remaining widgets flow below in a full-width grid.
- Move the "Redigera" / "Hantera kategorier" / "Klar" buttons into the same horizontal bar as the category title area (top-right of the content region, same visual line).

**Files:** `DashboardShell.tsx` (layout grid change), `DashboardGrid.tsx` HomeCategory (button positioning)

## Issue 2: Add a small 3D preview in Standby settings (Kameravy section)

**Current:** `StandbySettingsPanel` in `DashboardGrid.tsx` (lines ~300-418) has a dropdown for camera view and a "Spara aktuell kameravy" button, but no visual preview of what the standby camera will look like.

**Fix:**
- Add a small (~200px tall) inline `Scene3D` preview inside the Standby settings panel, below the camera view dropdown.
- This preview should show the selected standby camera angle so the user can see what they're choosing.
- Wrap it in a `glass-panel rounded-xl overflow-hidden` container.

**Files:** `DashboardGrid.tsx` (StandbySettingsPanel — add inline Scene3D import and render)

## Issue 3: Nav rail background should match the rest of the page (dark blue)

**Current:** `.nav-rail-bg` uses a separate gradient (`hsl(222 20% 10%)` to `hsl(222 18% 8%)`) which is slightly different/darker than `--background: 222 18% 11%`. This creates a visible color split.

**Fix:**
- Change `.nav-rail-bg` to use `bg-background` (same as page) with only the right border for separation. Remove the distinct gradient.
- Keep the border-right for structural separation but make the nav feel unified with the rest.

**Files:** `src/index.css` (`.nav-rail-bg` rule)

## Implementation order
1. CSS: nav-rail background → `background: hsl(var(--background))`
2. DashboardShell: change home layout to allow content below 3D
3. DashboardGrid HomeCategory: move buttons to same row
4. DashboardGrid StandbySettingsPanel: add small 3D preview

