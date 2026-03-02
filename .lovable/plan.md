

## Full Roadmap: EPIC A through I + Klimat-flik

Since this is ~20 features across 9 epics, each implementation message will handle 2-3 tasks. Here is the complete plan split into implementation sprints.

---

### Sprint 1: EPIC A -- Data, profiler & multi-device consistency

**A1: "Ta bort demo-projekt"**
- Add "Ta bort demo-projekt" button in `DataBackupCard.tsx`
- If demo is the active project: reset to empty initial state (reuse existing `clearAllFloors` + clear devices)
- Confirmation dialog with warning about what gets removed
- In hosted mode: also delete project on server via `DELETE /api/projects/demo`

**A2: "localStorage enforcement i HOSTED"**
- In `initHostedMode()` (useAppStore.ts): after bootstrap loads, run a one-time `localStorage.removeItem('hometwin-store')` cleanup
- Add a "Storage Mode" indicator in Settings showing HOSTED/DEV + last sync time
- Ensure `partialize` returns `{}` in hosted mode (already done, but verify edge cases)

**Files:** `DataBackupCard.tsx`, `useAppStore.ts`, `DashboardGrid.tsx` (settings section)

---

### Sprint 2: EPIC B -- HA connection stability

**B1: "Reconnect / Reload entities / Reset HA config"**
- Enhance `HAConnectionPanel.tsx` with 3 action buttons:
  - **Reconnect**: calls `disconnect()` then `connect()` with stored credentials
  - **Reload entities**: re-sends `get_states` over existing WS (or re-polls in hosted)
  - **Reset HA config**: clears wsUrl/token, disconnects, clears entities
- Add auto-reconnect status indicator with retry count

**B2: "Rate-limit / debounce service calls"**
- Create `src/lib/serviceThrottle.ts`:
  - Per-entity throttle (max 10 calls/sec per entity, last-write-wins)
  - Circuit breaker: if >5 errors in 10s, pause and show toast
- Wrap `haServiceCaller.current` through throttle in `Index.tsx`
- Apply throttle to slider `onValueChange` handlers in `DeviceControlCard.tsx` (lights, fans, volume)

**Files:** `HAConnectionPanel.tsx`, new `serviceThrottle.ts`, `Index.tsx`, `useHABridge.ts`

---

### Sprint 3: EPIC C1-C2 -- Entity remapping + RGB color picker

**C1: "Edit HA entity mapping from dashboard"**
- Add "Edit mapping" button in expanded `DevicesSection.tsx` device cards
- Show searchable entity dropdown (reuse `HAEntityPicker` from build mode)
- On change: call `updateDevice(id, { ha: { entityId } })` + re-map state from liveStates

**C2: "RGB color picker"**
- Replace R/G/B sliders in `LightControl` with an HSV color wheel (canvas-based)
- Keep brightness slider separate
- Send `rgb_color` or `hs_color` based on entity's `supported_color_modes`

**Files:** `DeviceControlCard.tsx`, `DevicesSection.tsx`, new `ColorPicker.tsx`

---

### Sprint 4: EPIC C3-C5 -- Energy sensors + Fan + Climate improvements

**C3: "Energy sensors"**
- Extend `EnergyWidget` + `EnergyDeviceList` to pull from HA `sensor.*_power` / `sensor.*_energy` entities
- Add entity picker in energy settings to select which sensors to track
- Show "Nu", "Idag", "Manad" tabs in energy panel

**C4: "Fan extended controls"**
- Extend `FanState` with `oscillate`, `direction`, `preset_modes`, `available_preset_modes`
- Update `FanControl` UI: preset mode buttons, oscillate toggle, direction toggle
- Gate UI elements on entity attributes (`supported_features`)

**C5: "Climate overhaul"**
- Extend `ClimateState` with `hvac_modes`, `fan_mode`, `swing_mode`, `preset_mode`, `target_temp_low/high`
- Add quick action buttons ("Heat 21", "Cool 23", "Auto")
- Show `current_humidity` if available
- Gate UI on entity's `supported_features`

**Files:** `types.ts`, `DeviceControlCard.tsx`, `EnergyWidget.tsx`, `EnergyDeviceList.tsx`, `haMapping.ts`, `useHABridge.ts`

---

### Sprint 5: EPIC D -- Camera & media

**D1: "Camera stream fallback chain"**
- In `CameraControl`: attempt MJPEG stream URL from HA entity attributes (`entity_picture`)
- In hosted mode: proxy through `/api/ha/camera_proxy/<entity_id>`
- Fallback chain: stream -> snapshot polling (5s) -> static placeholder
- Show clear error state with reason

**D2: "Camera freeze after refresh"**
- Defer OrbitControls re-binding until scene is fully mounted (add `ready` state in `Scene3D.tsx`)
- Ensure pointer event listeners are removed and re-added cleanly on HMR/reload

**D3: "Media/screen widget with image entities + AndroidTV"**
- New widget type in dashboard: `MediaScreenWidget`
- Pull `entity_picture`, `media_image_url` from HA attributes
- Display app artwork, media title, app_name from `media_player` attributes

**Files:** `DeviceControlCard.tsx`, `Scene3D.tsx`, `DeviceMarkers3D.tsx`, new `MediaScreenWidget.tsx`

---

### Sprint 6: EPIC E -- Weather override

**E1: "Precipitation mode override"**
- Add `precipitationOverride` to `EnvironmentState`: `'auto' | 'rain' | 'snow' | 'off'`
- UI in settings under environment: 4 toggle buttons
- `WeatherEffects3D.tsx` reads override; if not `auto`, forces that condition regardless of HA/API data
- Location source remains separate (HA/manual)

**Files:** `types.ts`, `useAppStore.ts`, `WeatherEffects3D.tsx`, `DashboardGrid.tsx` (settings section)

---

### Sprint 7: EPIC F -- Standby + Vio mode

**F1: "Vio mode + motion sensor wake"**
- Extend standby state machine: `Active -> Standby -> Vio`
  - Standby: current behavior (dim camera, info overlay)
  - Vio: near-black screen, minimal clock only, GPU paused (stop R3F render loop)
- Add `vioTimeout` setting (minutes after standby -> vio)
- Add `motionEntityId` setting: pick a `binary_sensor.*` from HA entities
- In `useIdleTimer`: subscribe to motion entity state changes; if `on` -> exit standby/vio
- Wake transition: vio -> active (skip standby on motion)

**Files:** `types.ts`, `StandbyMode.tsx`, `useIdleTimer.ts`, `DashboardGrid.tsx` (standby settings)

---

### Sprint 8: EPIC G -- Navigation & Home UI

**G1: "Expanding FAB navigation"**
- Replace `HomeNav` pill with a single center button that expands into 3 buttons on tap
- Animation: radial expand with spring transition
- Move camera FAB to consistent bottom-right position

**G2: "Device marker visibility"**
- Add outline/glow shader to markers in `DeviceMarkers3D.tsx` for better contrast
- Add `markerSize` setting in preferences: S/M/L (scales marker geometry)

**G3: "Build devices: better categorization"**
- Group device placement tools by category in `DevicePlacementTools.tsx`
- Categories: Lights, Switches, Climate, Fans, Sensors, Cameras, Vacuum, Media, Security, Other

**Files:** `HomeNav.tsx`, `CameraFab.tsx`, `DeviceMarkers3D.tsx`, `DevicePlacementTools.tsx`, `types.ts`

---

### Sprint 9: EPIC H -- Vacuum 3D movement

**H1: "Vacuum movement in 3D"**
- Debug current vacuum animation in `DeviceMarkers3D.tsx` (VacuumMarker section)
- Verify position source: check if `lawnmower pattern` movement code is still running
- Add debug overlay (toggle in vacuum control card) showing position/timestamp/status
- Ensure `useFrame` animation loop only runs when `status === 'cleaning'`

**Files:** `DeviceMarkers3D.tsx`, `DeviceControlCard.tsx`

---

### Sprint 10: EPIC I -- Performance (RPi)

**I1: "Default tablet mode for weak hardware"**
- On first boot (no persisted state): run hardware detection
- If `navigator.hardwareConcurrency <= 4` or `deviceMemory <= 4`: auto-set `tabletMode: true`
- Store flag `_autoDetectedPerformance` to avoid re-applying on subsequent boots

**I2: "RPi optimization package"**
- Lower DPR floor to 0.75 in tablet mode
- Add `maxLights` setting: in tablet mode, cap number of active pointLights in scene
- Batch entity state updates (collect changes over 100ms, apply once)
- Add "Performance HUD" toggle in settings: shows FPS, tri-count, material count overlay

**Files:** `PerformanceSettings.tsx`, `useAppStore.ts`, `Scene3D.tsx`, `DeviceMarkers3D.tsx`

---

### Sprint 11: Climate Tab (Extra)

- New dashboard tab "Klimat" in `DashboardGrid.tsx`
- "Comfort engine" UI:
  - Select temperature sources (climate/sensor entities)
  - Select controllable devices (fan/climate)
  - Define rules: "If temp > X -> device Y at Z%"
  - Hysteresis setting (default 0.5C)
  - Schedule: day/night mode
- Widgets: "Comfort status" card, "Next action", "Override 30 min" button
- Client-side rule engine (runs in `useEffect` loop, checks every 30s)
- Store rules in `automations` slice with type `comfort_rule`

**Files:** `types.ts`, `DashboardGrid.tsx`, new `ClimateTab.tsx`, new `ComfortEngine.ts`

---

### Implementation Order

Each sprint will be implemented as 1-2 messages. Total: ~11-14 messages to complete everything. Ready to start with Sprint 1 (EPIC A) on approval.
