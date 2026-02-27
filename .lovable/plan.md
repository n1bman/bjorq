

# Standby Mode V1

## New Files

### `src/components/standby/StandbyMode.tsx`
Main standby component with split layout (70/30). Left side renders `Scene3D` with a slow auto-orbit camera. Right side shows a vertical stack: large clock (text-7xl), weather, and status widgets. Full-screen dark overlay. Touch/mouse/key listeners call `exitStandby()` to return to previous mode. Uses the existing `.standby-layout` CSS grid class from `index.css`.

### `src/components/standby/StandbyClock.tsx`
Large standalone clock for standby. Time in `text-7xl font-bold`, date in `text-xl`, week number in `text-sm`. Updates every second. Minimal styling, no panel border — just text with soft glow.

### `src/components/standby/StandbyWeather.tsx`
Large weather display using existing store data (`environment.weather`). Large icon + temperature in `text-5xl`, condition label below. No interactivity.

### `src/components/standby/StandbyWidgets.tsx`
Renders selected visible widgets (from `homeView.visibleWidgets`) in a vertical read-only stack — simplified versions of energy and temperature data. No click handlers.

### `src/components/standby/useIdleTimer.ts`
Custom hook. Listens for `mousemove`, `mousedown`, `touchstart`, `keydown`. Resets a timer on each event. When idle time exceeds the configured threshold, calls `enterStandby()`. Disabled when `standby.enabled` is false or when in build mode.

## Modified Files

### `src/store/types.ts`
- Add `StandbySettings` interface: `{ enabled: boolean; idleMinutes: number }` (idleMinutes options: 0.5, 1, 2, 5)
- Add `standby: StandbySettings` to `AppState`
- Add `setStandbySettings: (s: Partial<StandbySettings>) => void` to `AppState`
- Extend `AppMode` from `'home' | 'dashboard' | 'build'` to include `'standby'`

### `src/store/useAppStore.ts`
- Add initial `standby: { enabled: false, idleMinutes: 2 }` state
- Add `setStandbySettings` action
- Store the previous `appMode` before entering standby (add `_preStandbyMode` field)

### `src/pages/Index.tsx`
- Add `appMode === 'standby'` branch that renders `<StandbyMode />`

### `src/components/home/HomeNav.tsx`
- No change to nav items (standby is not a manual nav destination — it's entered via idle timer or settings button)

### `src/components/home/DashboardGrid.tsx` (SettingsCategory)
- Add "Standby-läge" section inside `SettingsCategory`:
  - Toggle switch for `standby.enabled`
  - Select dropdown for idle time (30s, 1m, 2m, 5m)
  - "Förhandsgranska Standby" button that sets `appMode` to `'standby'`

### `src/components/Scene3D.tsx`
- Add a `StandbyOrbitCamera` sub-component: when `appMode === 'standby'`, uses `useFrame` to slowly rotate camera around the house (azimuth += delta * 0.1). No user orbit controls. Falls back to existing `CameraController` otherwise.

## Behavior Summary

- **Enter**: Auto after idle timeout OR manually via Settings → "Förhandsgranska Standby"
- **Exit**: Any touch/mouse/key → returns to previous `appMode`
- **Performance**: Same Scene3D, slow orbit (no rapid updates), no UI overlays except right panel
- **No existing features modified**: All existing screens, widgets, integrations untouched

