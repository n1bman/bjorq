

# Fix default camera to topdown for home & dashboard

## Problem
Camera starts at `[12, 12, 12]` (angled) by default. User wants topdown `[0, 25, 0.01]` as the starting position for both home and dashboard. After initial positioning, camera should be free to orbit.

## Changes

### `src/components/Scene3D.tsx`
1. Change initial Canvas camera position from `[12, 12, 12]` to `[0, 25, 0.01]` (topdown)
2. Update the mode-switch effect to also trigger topdown when entering `'home'` mode (not just dashboard)
3. Keep the lerp-and-release behavior so the user can freely orbit after the initial animation

### Specific edits
- Line ~73: Expand condition to `(appMode === 'dashboard' || appMode === 'home') && prevMode.current !== appMode`
- Line ~198 (Canvas): Change `camera={{ position: [12, 12, 12], ...}}` → `camera={{ position: [0, 25, 0.01], ...}}`

