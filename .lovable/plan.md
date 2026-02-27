

# Standby Mode Refinement V3

## Changes

### 1. Add `cameraView` to `StandbySettings` (`src/store/types.ts`)
Add a new type and field:
```typescript
export type StandbyCameraView = 'standard' | 'topdown' | 'angled-left' | 'angled-right' | 'close';
export interface StandbySettings {
  enabled: boolean;
  idleMinutes: number;
  cameraView: StandbyCameraView; // default: 'standard'
}
```

### 2. Update store default (`src/store/useAppStore.ts`)
Add `cameraView: 'standard'` to initial standby state.

### 3. Replace orbit camera with static camera (`src/components/Scene3D.tsx`)
- Remove `StandbyOrbitCamera` (the rotating one).
- Replace with `StandbyStaticCamera`: reads `standby.cameraView` from store, sets camera position once (no animation, no orbit). Five preset positions:
  - `standard`: `[10, 9, 10]` looking at `[0, 1, 0]` — dollhouse angle ~40°
  - `topdown`: `[0, 22, 0.01]` looking at `[0, 0, 0]`
  - `angled-left`: `[-10, 9, 10]` looking at `[0, 1, 0]`
  - `angled-right`: `[10, 9, -10]` looking at `[0, 1, 0]`
  - `close`: `[6, 6, 6]` looking at `[0, 1, 0]`
- No OrbitControls rendered in standby mode (already the case).
- **Hide Grid in standby**: wrap the `<Grid>` component with a check — only render when `appMode !== 'standby'`.

### 4. Redesign StandbyMode layout (`src/components/standby/StandbyMode.tsx`)
- Remove the split 70/30 grid layout with bordered panels.
- Make 3D scene fullscreen (`fixed inset-0`).
- Overlay the info panel on the right side using `absolute right-0 top-0 bottom-0 w-[30%]` with a semi-transparent gradient background (`bg-gradient-to-l from-background/60 to-transparent backdrop-blur-sm`).
- Clock, weather, and widgets float over the scene with no hard panel borders.

### 5. Add camera view selector to settings (`src/components/home/DashboardGrid.tsx`)
Add a camera view dropdown to `StandbySettingsPanel`:
```
Kameravy: [Standard ▼]
```
Options: Standard, Ovanifrån, Vinkel vänster, Vinkel höger, Närbild.
Uses `setStandbySettings({ cameraView: value })`.

## Files Changed

| File | Change |
|------|--------|
| `src/store/types.ts` | Add `StandbyCameraView` type, add `cameraView` to `StandbySettings` |
| `src/store/useAppStore.ts` | Default `cameraView: 'standard'` |
| `src/components/Scene3D.tsx` | Replace orbit camera with static presets, hide grid in standby |
| `src/components/standby/StandbyMode.tsx` | Fullscreen 3D + floating transparent overlay |
| `src/components/home/DashboardGrid.tsx` | Add camera view selector to standby settings |

