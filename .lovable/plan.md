

# Correction Plan — 5 Tasks

## Task 1: Make 3D view a widget card in the Home grid (not a separate column)

**Problem:** Currently `DashboardShell.tsx` renders 3D in a 2-column grid with Content beside it. Widgets can never flow below the 3D view because Content is entirely in the right column.

**Fix:** Remove the 3D split layout from `DashboardShell.tsx`. Instead, render Content full-width always. In `HomeCategory` inside `DashboardGrid.tsx`, inject a "3D Preview" card as the first item in the `SortableWidgetGrid` (a draggable widget like any other). This makes 3D a widget that participates in the grid, and other cards naturally flow below it.

- `DashboardShell.tsx`: Remove the `show3D` grid logic. Always render `<Content />` in a single full-width container.
- `DashboardGrid.tsx` `HomeCategory`: Add a 3D preview widget (col-span-2, ~280px height) as the first entry in the sortable grid. Import `Scene3D`.

## Task 2: Fix device name text truncation

**Problem:** Device names in CategoryCard are truncated to near-invisible because the card is squeezed and `truncate` class clips aggressively alongside the slider + switch taking up space.

**Fix:** In `CategoryCard.tsx`, increase min-width for device name area and reduce the inline brightness slider width. Ensure `d.name` is displayed with `min-w-0` on the flex container but without aggressive truncation that hides the entire name.

## Task 3: Put Redigera / Hantera kategorier / Klar on same row

**Problem:** The "Klar" button is rendered inside `SortableWidgetGrid` while "Redigera" and "Hantera kategorier" are in `HomeCategory`. They appear on different rows.

**Fix:** Move the edit mode controls out of `SortableWidgetGrid` into `HomeCategory`. All three buttons ("Redigera", "Hantera kategorier", "Klar") render in a single `flex items-center gap-2` row. The `SortableWidgetGrid` receives `editMode` as a prop instead of managing it internally, and its internal header is removed.

## Task 4: Bring camera closer in dashboard 3D view

**Problem:** Default camera angle `presetPositions.angle` is `(12, 12, 12)` — too far for the compact dashboard widget.

**Fix:** In `Scene3D.tsx` `CameraController`, when in `dashboard` mode and using the default angle preset, use a closer position like `(8, 7, 8)` with target `(0, 0.5, 0)`. This makes the house fill more of the 3D widget.

## Task 5: Update docs and bump version for release

**Files to update:**
- `CHANGELOG.md` — add `[1.1.0]` entry covering the dashboard redesign (unified shell, nav rail, room-based grouping, drag-to-reorder, standby 3D preview, visual polish)
- `README.md` — bump version badge to 1.1.0
- `bjorq_dashboard/README.md` — bump version badge, add "Unified Dashboard" to features list
- `bjorq_dashboard/config.yaml` — bump version to `1.1.0`
- `docs/03-using-the-dashboard.md` — update dashboard section to describe new nav rail layout, room-based device grouping, drag-to-reorder widgets
- `package.json` — already at 1.1.0, confirm

## Files Changed

| File | Change |
|------|--------|
| `src/components/home/DashboardShell.tsx` | Remove 3D split layout, always render Content full-width |
| `src/components/home/DashboardGrid.tsx` | Add 3D widget to HomeCategory grid, move all edit buttons to single row |
| `src/components/home/SortableWidgetGrid.tsx` | Accept `editMode` as prop, remove internal edit mode header |
| `src/components/home/cards/CategoryCard.tsx` | Fix device name truncation |
| `src/components/Scene3D.tsx` | Closer default camera for dashboard mode |
| `CHANGELOG.md` | Add 1.1.0 entry |
| `README.md` | Bump version badge |
| `bjorq_dashboard/README.md` | Bump version, update features |
| `bjorq_dashboard/config.yaml` | Bump to 1.1.0 |
| `docs/03-using-the-dashboard.md` | Update dashboard documentation |

