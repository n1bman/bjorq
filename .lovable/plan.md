
# Robot Vacuum System Overhaul — COMPLETED

All four problems have been addressed:

1. **Vacuum double-offset fix** — Vacuum markers no longer apply position on the outer group; position is passed directly to the component which manages world-space movement internally.

2. **Zone rename** — Added `renameVacuumZone` store action. Zone names are now editable inline (click name or edit icon), with a datalist suggesting existing room names and HA room names.

3. **VacuumDock3D** — 3D charging station model with base plate, back plate, LED indicator (green when docked), and charging contacts. Rendered for each floor with a dock position. Selectable in build mode.

4. **HA zone sync awareness** — Zones show ✓ or ⚠ icons indicating whether the zone name matches a known HA room. Hint text guides users to match zone names with HA room names.
