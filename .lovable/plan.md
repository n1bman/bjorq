

# Fix: 3D not visible in Home/Dashboard + Add "Reset Graphics" button

## Problem Analysis

The 3D scene is black on Home view and Dashboard, but works in Build mode. Two issues:

1. **BuildScene3D still has the old useless `ContextLossHandler`** — it never actually recovers from context loss. Scene3D was fixed, but BuildScene3D was not. When switching from Build (where context may have been lost) back to Home, the new Canvas can inherit GPU instability.

2. **No way to reset graphics settings** — if a user accidentally sets problematic combinations (e.g. environment light off, tone mapping off, extreme exposure), there's no quick way back to working defaults.

## Changes

### 1. `src/components/build/BuildScene3D.tsx` — Add context recovery
- Replace the old `ContextLossHandler` with the same recovery pattern used in Scene3D
- Add `recoveryCount` state, `onCreated` handler with `webglcontextlost` listener
- Add recovery overlay ("Återställer 3D...")
- Include `recoveryCount` in Canvas key

### 2. `src/components/home/cards/GraphicsSettings.tsx` — Add "Reset to defaults" button
- Add a "Återställ standard" button at the bottom of the panel
- Resets all performance settings to known-good defaults:
  - quality: 'high', shadows: true, postprocessing: false
  - tabletMode: false, antialiasing: true, toneMapping: true
  - exposure: 1.0, environmentLight: true, maxLights: 0, showHUD: false
- Clears `_autoDetectedPerformance` flag so auto-detect can run again if needed
- Shows a toast confirmation
- Also resets `dashboardBg` back to `'scene3d'` so the 3D background comes back on Dashboard

### 3. `src/components/home/DashboardView.tsx` — Fallback for missing `dashboardBg`
- Add nullish coalescing: `dashboardBg ?? 'scene3d'` to prevent edge case where stored value is undefined/null and nothing renders

## Files
| File | Action |
|------|--------|
| `src/components/build/BuildScene3D.tsx` | Fix context recovery |
| `src/components/home/cards/GraphicsSettings.tsx` | Add reset button |
| `src/components/home/DashboardView.tsx` | Add fallback for dashboardBg |

