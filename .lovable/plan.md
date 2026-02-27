

# Standby & UI Fixes

## 4 Changes

### 1. Darker standby overlay (`src/components/standby/StandbyMode.tsx`)
Change the right-side overlay from `from-background/60` to `from-background/80` for better text contrast against the 3D scene.

### 2. Custom standby camera position (`src/store/types.ts`, `useAppStore.ts`, `Scene3D.tsx`, `DashboardGrid.tsx`)
Replace the fixed preset system with a user-positionable camera:
- Add `customCameraPos: [number, number, number]` and `customCameraTarget: [number, number, number]` to `StandbySettings`
- Add a "Spara nuvarande vy" button in standby settings that captures the current OrbitControls camera position/target as the standby camera
- Keep preset dropdown as starting points but also store the exact position
- In `StandbyStaticCamera`, use the custom position if set, otherwise fall back to the preset

Actually, simpler approach: keep presets but let the user **preview standby and adjust**. Even simpler — just keep the presets but make them better positioned. The user says the angles aren't right.

Better approach: Add a "Ställ in kamera" flow — when user clicks it, enter a special mode where they can orbit freely in standby, then click "Spara position" to lock it. This adds complexity though.

Simplest fix: Improve the preset positions to be more centered on the house, and keep the existing dropdown. The presets target `[0,1,0]` which assumes the house is centered at origin. If the user's house isn't centered there, the camera will look wrong. Let me add a `custom` camera option where the user can set position via the home view's current camera.

Final approach — add a "Spara aktuell kameravy" button in settings that saves the current home-screen camera position as a custom standby camera preset.

- Add `custom` to `StandbyCameraView` type
- Add `customPos` and `customTarget` fields to `StandbySettings`
- In `StandbySettingsPanel`, add a "Spara aktuell vy som standby-kamera" button that reads `homeView.cameraPreset` position or current orbit position
- Need to expose current camera pos from the 3D scene — store it in a ref or zustand

Practical approach: Store camera position in zustand when user clicks "save". Use a global ref for the Three.js camera.

### 3. Hide 3D grid in home & dashboard (`src/components/Scene3D.tsx`)
Change grid condition from `appMode !== 'standby'` to `appMode === 'build'` so grid only shows in build mode.

### 4. Fix EnergyWidget text wrapping (`src/components/home/cards/EnergyWidget.tsx`)
- Add `whitespace-nowrap` to the watt value
- Reduce value text from `text-2xl` to `text-xl`
- Adjust min-width to accommodate the text without breaking

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/standby/StandbyMode.tsx` | Darker overlay gradient |
| `src/components/Scene3D.tsx` | Grid only in build mode; support custom camera |
| `src/components/home/cards/EnergyWidget.tsx` | Fix text wrapping, reduce font size |
| `src/store/types.ts` | Add `'custom'` to `StandbyCameraView`, add `customPos`/`customTarget` |
| `src/store/useAppStore.ts` | Default custom camera fields, add `saveStandbyCamera` action |
| `src/components/home/DashboardGrid.tsx` | Add "Spara aktuell kameravy" button, add `custom` option |
| `src/components/home/CameraFab.tsx` | Expose camera save function (store current camera pos to zustand on demand) |

