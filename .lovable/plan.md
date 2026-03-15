

# Plan: Floor-level fix, Toolbar interaction locks, labels & keyboard shortcuts

## Problem 1 — Floor/model level mismatch

The floor mesh renders at `Y = elevation + 0.02` and the ground plane at `Y = -0.03`. Props with `placement: 'floor'` land at `Y = elevation` (0.0 for ground floor). This creates a visible gap where models sink into/float above the floor.

**Fix:** Introduce a constant `FLOOR_VISUAL_OFFSET = 0.02` and use it consistently:
- `Floors3D.tsx`: Already uses `elevation + 0.02` — keep as-is, this is the "visual floor surface"
- `placementEngine.ts` (`findLandingPosition`): For `floor` placement, return `floorElevation + 0.02` instead of bare `floorElevation`
- `GroundPlane.tsx`: Move from `Y = -0.03` to `Y = -0.01` (just below floor surface, prevents z-fighting)
- `BuildInspector.tsx` (DeviceInspector height slider): Clamp minimum to `elevation + 0.02`
- This ensures all floor-placed objects (vacuums, furniture, devices) sit flush with the visible floor surface

## Problem 2 — Interaction lock mode in toolbar

Add a "lock" toggle group to the top toolbar that controls what can be interacted with in 3D. Four modes:

| Mode | Label | Allows interaction with |
|------|-------|------------------------|
| `all` | Allt | Everything (default) |
| `walls` | Väggar | Only walls/openings |
| `props` | Möbler | Only furniture/props |
| `devices` | Enheter | Only device markers |

**Implementation:**
- `types.ts`: Add `editLock: 'all' | 'walls' | 'props' | 'devices'` to `BuildState`
- `useAppStore.ts`: Add `setEditLock` action, default to `'all'`
- `BuildTopToolbar.tsx`: Add a segmented toggle group (4 buttons with icons + labels) between the view toggle and the spacer
- `PersistentScene3D.tsx` (Props3D interactions): Check `editLock` — skip pointer events if lock is `walls` or `devices`
- `InteractiveWalls3D.tsx`: Check `editLock` — skip if `props` or `devices`
- `DeviceMarkers3D.tsx`: Check `editLock` — skip if `walls` or `props`

## Problem 2.1 — Labels under toolbar icons

Currently the toolbar only shows icons with `title` tooltips. Add small text labels below each icon button.

**Fix in `BuildTopToolbar.tsx`:**
- Change button layout to `flex-col` with icon + `<span className="text-[8px]">` label
- Labels: Hem, Panel, Ångra, Gör om, 2D, 3D, Isolera, ?, Optimera, Hela, Rum, Spöke, Projekt, Inställn., Våningar, Klar

## Problem 2.2 — Keyboard shortcuts not working

The shortcuts listed in the help dialog (W, S, D, G) are documented but never implemented. Only Escape and Ctrl+Z have handlers.

**Fix:** Add a global `keydown` listener in `BuildTopToolbar.tsx` or `BuildModeV2.tsx`:
- `W` → `setBuildTool('wall')`
- `S` → `setBuildTool('select')`
- `D` → `setBuildTool('door')`
- `G` → `toggleGrid()`
- `Delete/Backspace` → delete selected item
- `Ctrl+Z` → `undo()`
- `Ctrl+Shift+Z` → `redo()`
- Guard: skip when an `<input>` or `<textarea>` is focused

## Files changed

1. `src/store/types.ts` — add `editLock` field to `BuildState`
2. `src/store/useAppStore.ts` — add `setEditLock` action, default value, include in mode reset
3. `src/lib/placementEngine.ts` — add `+0.02` offset for floor placement
4. `src/components/build/GroundPlane.tsx` — change position Y from `-0.03` to `-0.01`
5. `src/components/build/BuildTopToolbar.tsx` — add labels, lock toggle, keyboard shortcut listener
6. `src/components/PersistentScene3D.tsx` — check `editLock` in prop/device/wall interactions
7. `src/components/build/InteractiveWalls3D.tsx` — check `editLock`
8. `src/components/devices/DeviceMarkers3D.tsx` — check `editLock`
9. `src/components/build/BuildInspector.tsx` — clamp device height min to floor surface

