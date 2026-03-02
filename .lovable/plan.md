

## Plan: Fix 5 Issues + Release v0.2.0

### Issue Analysis

**1. Speaker not syncing with HA**
Root cause: `getDefaultState()` in `useAppStore.ts` has no `case 'speaker'` or `case 'soundbar'` — falls through to `default`, returning `{ kind: 'generic', data: { on: false } }`. This means newly placed speakers have `kind: 'generic'` state, so `SpeakerMarker3D` reads `null` from `state?.kind === 'speaker'`. The HA bridge (`useHABridge.ts`) dispatches commands based on `entityId` domain (`media_player`), which works for the command side — but the initial state mismatch prevents the marker from reflecting HA state until the first `updateHALiveState` call maps it correctly. Additionally, the bridge's `media_player` handler silently drops commands when `data.state === 'idle'`, which is the speaker's default mapped state.

**2. Sync delay in hosted mode**
The hosted mode polls HA states every 5 seconds (`setInterval(pollStates, 5000)` in `useHomeAssistant.ts`). This is noticeably slower than WebSocket real-time updates. Reducing the interval to 2 seconds will improve responsiveness.

**3. Screen device not visible in release**
The `MediaScreenMarker` renders a `CanvasTexture` on a `planeGeometry`. In production builds, the issue is likely that `canvasRef.current` initialization happens outside React lifecycle (lines 427-431 in DeviceMarkers3D.tsx), and the canvas dimensions depend on `config.aspectRatio`. The screen marker works in dev but the production build may have different initialization timing. Need to verify the marker renders with a proper fallback.

**4. Version shows v0.0.0 in release**
The version is hardcoded as `APP_VERSION = '0.1.8'` in `ProfilePanel.tsx`. This is manually maintained and easily forgotten. The release build doesn't inject the version from `package.json`. Fix: Use Vite's `define` to inject `__APP_VERSION__` at build time from `package.json`.

**5. Sliders too sensitive in build mode**
Build mode sliders use `step={0.1}` for position/scale, making it hard to land on exact integers. Fix: Add number input fields alongside sliders for precise values, and use coarser steps (0.5 for position, 0.25 for scale) with the option to type exact values.

### Changes

**1. `src/store/useAppStore.ts`** — Add `case 'speaker'` and `case 'soundbar'` to `getDefaultState()` returning proper `SpeakerState`.

**2. `src/hooks/useHomeAssistant.ts`** — Reduce hosted poll interval from 5000ms to 2000ms.

**3. `src/hooks/useHABridge.ts`** — In the `media_player` case, handle speaker kind separately: don't drop commands for `idle` state speakers when volume changes. Add explicit handling for speaker volume-only changes.

**4. `vite.config.ts`** — Add `define: { '__APP_VERSION__': JSON.stringify(require('./package.json').version) }` to inject version at build time.

**5. `src/components/home/cards/ProfilePanel.tsx`** — Replace hardcoded `APP_VERSION` with `__APP_VERSION__` (declared in a `.d.ts` or inline).

**6. `src/components/build/BuildInspector.tsx`** — For position/scale/rotation sliders in the device inspector: add a small numeric `<Input>` next to each slider showing the current value, editable for precision. Round slider values to step precision on change. Use `step={0.5}` for position, `step={0.25}` for scale.

**7. `src/components/devices/DeviceMarkers3D.tsx`** — Ensure `MediaScreenMarker` has a visible fallback when canvas texture fails (solid colored plane with label).

**8. `package.json`** — Bump version to `0.2.0`.

**9. `src/vite-env.d.ts`** — Declare `__APP_VERSION__` global constant.

### Files Modified (8-9)
1. `src/store/useAppStore.ts` — speaker/soundbar default state
2. `src/hooks/useHomeAssistant.ts` — faster poll interval
3. `src/hooks/useHABridge.ts` — speaker command handling
4. `vite.config.ts` — version injection via define
5. `src/vite-env.d.ts` — type declaration for __APP_VERSION__
6. `src/components/home/cards/ProfilePanel.tsx` — dynamic version
7. `src/components/build/BuildInspector.tsx` — precise slider inputs
8. `src/components/devices/DeviceMarkers3D.tsx` — screen marker fallback
9. `package.json` — version 0.2.0

