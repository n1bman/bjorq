# bjorQ Dashboard — Roadmap vNext

> Living document tracking all planned features and improvements.
> Updated: 2026-03-08

---

## Implementation Rules

- **Relative imports only** — No `@/` aliases (CI enforced via grep check)
- **Dev mode must not break** — Lovable preview must always work
- **Hosted mode stays functional** — `_hostedMode` dual-architecture preserved
- **Phase-by-phase** — Each phase is a separate commit/PR with changelog
- **Semantic tokens** — All colors via CSS custom properties, never hardcoded

---

## Phase Overview

| Phase | Title | Status | Dependencies |
|-------|-------|--------|-------------|
| 1 | UI/UX Consistency & Settings Restructure | ✅ Done | — |
| 2 | Core Feature Expansion | ✅ Done | Phase 1 |
| 3 | Dashboard Enhancements | ✅ Done | Phase 2 |
| 4 | Smart Home Intelligence Layer | ✅ Done | Phase 2 |
| 5 | Build & Asset Improvements | ✅ Done | Phase 1 |
| 6 | Monitoring & Activity System | ✅ Done | Phase 2 |
| 7 | 3D & Lighting Engine Refinement | ✅ Done | Phase 2 |
| 8 | Vacuum Debug & 3D Telemetry | ✅ Done | Phase 7 |
| 9 | RPi Performance Optimization | ✅ Done | Phase 7 |
| 10 | Climate & Comfort Engine | ✅ Done | Phase 4 |

---

## 🔵 Phase 1 — UI/UX Consistency & Structural Cleanup

### 1.1 Global Theme & Design Consistency

- Unified spacing tokens (`--space-panel`, `--space-section`)
- Consistent glass-panel styling across all cards
- Toggle state clarity (active/inactive/disabled) via shared `OptionButton` component
- Theme improvements: Midnight and Light themes with clear CSS variable palettes via `useThemeEffect`
- Visual hierarchy in Settings cleaned up

### 1.2 Settings Restructure

- `LocationSettings` removed from `WeatherCategory` (only in Settings)
- `ProfilePanel` enhanced with version display and location summary
- `PerformanceSettings` quality buttons use `OptionButton` with stronger contrast
- Settings panels grouped: Utseende → System → Anslutning → Data

**Files modified:** `src/index.css`, `src/components/home/DashboardGrid.tsx`, `src/components/home/cards/ProfilePanel.tsx`, `src/components/home/cards/PerformanceSettings.tsx`
**New component:** `src/components/ui/OptionButton.tsx`
**Schema changes:** None

---

## 🟢 Phase 2 — Core Feature Expansion

### 2.1 WiFi Sharing

New Settings section + optional Home Widget:
- Store SSID + password (server-side in hosted mode, localStorage in dev)
- Generate QR code dynamically
- Toggle QR visibility

**Schema changes:** Add `wifi: { ssid: string; password: string; visible: boolean }` to `AppState`
**New files:** `src/components/home/cards/WifiPanel.tsx`, `src/components/home/cards/WifiWidget.tsx`

### 2.2 Device Direct Interaction in 3D

- All on/off devices clickable in 3D view
- Toggle state via click/touch
- Sync with HA (if connected)
- Visual animation (light intensity, switch state)
- Applies to: lights, switches, future devices

**Files modified:** `src/components/devices/DeviceMarkers3D.tsx`, `src/components/build/Props3D.tsx`
**Schema changes:** None (uses existing `deviceStates`)

### 2.3 Light Type Selection in Build Mode

Under Build → Devices → Lights:
- Choose type: round ceiling, strip, wall light, spot, custom
- Store `lightType` in `DeviceMarker`

**Schema changes:** Add `lightType?: 'ceiling' | 'strip' | 'wall' | 'spot' | 'custom'` to `DeviceMarker`
**Files modified:** `src/components/build/devices/DevicePlacementTools.tsx`, `src/store/types.ts`

---

## 🟡 Phase 3 — Dashboard Enhancements

### 3.1 Weather Tab

- Always visible weather section
- Larger primary weather card
- Clear hierarchy: temperature → condition → forecast

**Files modified:** `src/components/home/cards/WeatherWidget.tsx`, `DashboardGrid.tsx`

### 3.2 Energy System Upgrade

Two modes:
- **HA connected:** Live usage, daily/monthly cost, dynamic pricing
- **Not connected:** Manual device consumption (watt estimate per device), price per kWh, automatic cost estimation

When placing a device: optional "Estimated active watt usage" field.

**Schema changes:** Add `energyConfig: { pricePerKwh: number; currency: string }` to `AppState`. Add `estimatedWatts?: number` to `DeviceMarker`.
**Files modified:** `src/components/home/cards/EnergyWidget.tsx`, `src/components/home/cards/EnergyDeviceList.tsx`

### 3.3 Calendar Expansion → Smart Home Calendar

- Google Calendar sync (OAuth)
- Outlook sync (OAuth)
- Event display with reminders
- Widget notification support
- Standby screen notifications

**Schema changes:** Add `calendar: { sources: CalendarSource[]; events: CalendarEvent[] }` to `AppState`
**Security:** OAuth tokens stored server-side in hosted mode only

---

## 🟣 Phase 4 — Smart Home Intelligence Layer

### 4.1 Automations

New menu item under Kontrollpanel:
- Trigger → Action structure
- HA sync compatible
- Examples: Motion → Light on, Time → Scene activate

**Schema changes:** Add `automations: Automation[]` to `AppState`
```ts
interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  trigger: { type: 'time' | 'device_state' | 'event'; config: Record<string, unknown> };
  actions: { type: 'device_toggle' | 'scene_activate' | 'notification'; config: Record<string, unknown> }[];
}
```

### 4.2 Scenes

- Save current device states as a scene
- Schedule scene activation
- Activate manually
- Sync with HA scenes if available

**Schema changes:** Add `scenes: Scene[]` to `AppState`

### 4.3 Voice Control

- Local mic trigger
- Optional AI integration
- Sync with HA, Alexa, Google Home
- Modular architecture for provider switching

**Architecture:** New `src/lib/voiceEngine.ts` abstraction layer

---

## 🔵 Phase 5 — Build & Asset Improvements

### 5.1 Furniture Import Improvements

- Custom name on import
- Category selection
- User asset library with sorting & grouping
- Remove random ID display in UI

**Files modified:** `src/components/build/furnish/FurnishTools.tsx`, `src/store/types.ts` (extend `PropCatalogItem`)

### 5.2 More Home Widgets

Extend widget system:
- WiFi widget
- Calendar widget
- Scenes widget
- Automation status widget
- Activity alerts widget

**Architecture:** Widget registry pattern in `src/components/home/cards/`

---

## 🔴 Phase 6 — Monitoring & Activity System

### 6.1 Surveillance Upgrade

- Camera preview in standby view on HA trigger
- Dismiss action
- Improved logging

### 6.2 Activity Split System

Split into two logs:
- **System Activity:** UI changes, scene activation, light adjustments
- **Device Activity:** Motion sensors, door open, alarm triggers

Per-category notification toggle. Future: push notifications.

**Schema changes:** Add `category: 'system' | 'device'` to `ActivityEvent`

---

## 🟤 Phase 7 — 3D & Lighting Engine Refinement ✅

### 7.1 Light Type-Specific 3D Sources

Each light type now emits differently in the 3D scene:
- **Ceiling** — `pointLight`, downward, distance 8, decay 2 (sphere mesh)
- **Strip** — `pointLight` with wider spread (distance 10, decay 1.5) + elongated emissive box mesh
- **Spot** — `spotLight` with narrow 30° cone, high intensity, castShadow, cone mesh indicator
- **Wall** — `spotLight` with wider 60° cone, wall-wash direction, castShadow, half-dome mesh

### 7.2 Full XYZ Rotation for All Devices

All device types now have X/Y/Z rotation sliders in the inspector (previously only screens had full rotation). This allows aiming spotlights, tilting wall lights, etc.

### 7.3 Removed "Anpassad" Light Type

Simplified to 4 clear light types: Tak, Strip, Vägg, Spot.

### 7.4 Shadow Improvements

- SpotLights from spot and wall light types cast shadows with quality-scaled shadow maps
- **Imported house model does NOT cast shadows** (so sunlight/lamp light enters interiors); only receives shadows
- Props/furniture `castShadow` and `receiveShadow` on all meshes — realistic furniture shadows
- BuildScene3D respects global performance settings (shadows toggle, quality level, DPR)
- "Solljus-transparens" slider lets users make imported models semi-transparent so sunlight enters the house

### 7.5 Full XYZ Rotation for Imported Models

- Three independent rotation sliders (X, Y, Z) each -180° to 180°
- Fixed double-conversion bug (radians stored, were re-converted in renderer)

### 7.6 Robust 3D Loader & WebGL Context Recovery

- Manual GLTFLoader with state machine (`idle` → `loading` → `ready` | `error`)
- 30-second timeout with automatic retry + cache-busting
- "Ladda om 3D-modell" button on persistent error
- Proper `geometry.dispose()` / `material.dispose()` / texture disposal on model swap (prevents GPU memory leaks)
- WebGL `contextlost` / `contextrestored` handlers in both Scene3D and BuildScene3D — auto-recovery on tablets

### 7.7 Black Text Fix

- Input component and ModeHeader explicitly use `text-foreground` to prevent invisible text on dark themes

**Files modified:** `src/store/types.ts`, `src/components/devices/DeviceMarkers3D.tsx`, `src/components/build/BuildInspector.tsx`, `src/components/build/ImportedHome3D.tsx`, `src/components/build/Props3D.tsx`, `src/components/build/BuildScene3D.tsx`, `src/components/build/import/ImportTools.tsx`, `src/components/Scene3D.tsx`, `src/components/ui/input.tsx`, `src/components/ModeHeader.tsx`

---

## Changelog

### Phase 1 — 2026-03-01
- Added spacing tokens to CSS (`--space-panel`, `--space-section`)
- Created `OptionButton` component for consistent toggle states
- Improved theme palettes in `useThemeEffect` (midnight/light clarity)
- Removed `LocationSettings` from Weather tab
- Enhanced `ProfilePanel` with version and location info
- Regrouped Settings with section headers
- Created this roadmap document

---

## 🟠 Phase 8 — Vacuum Debug & 3D Telemetry ✅

### 8.1 Vacuum Debug Overlay

- `showDebugOverlay` toggle in `VacuumState`
- `VacuumDebugInfo` interface: 3D coords, target point, zone, animation state
- Real-time telemetry written from `useFrame` at 2 Hz (throttled)
- Debug UI in `RobotPanel` with live/stale indicator and raw telemetry

**Files modified:** `src/store/types.ts`, `src/store/useAppStore.ts`, `src/components/devices/DeviceMarkers3D.tsx`, `src/components/home/cards/RobotPanel.tsx`, `src/components/home/cards/DataBackupCard.tsx`

---

## 🔵 Phase 9 — RPi Performance Optimization ✅

### 9.1 Hardware Auto-Detection

- `autoDetectPerformance()` checks `hardwareConcurrency ≤ 4` or `deviceMemory ≤ 4`
- Auto-enables tablet mode, low quality, maxLights = 4
- One-time detection flag `_autoDetectedPerformance`

### 9.2 Performance HUD

- Floating overlay: FPS, quality level, CPU cores
- DPR floor lowered to 0.75 in tablet mode
- maxLights cap (0–16) with slider in settings
- Antialiasing auto-disabled on weak hardware

**Files modified:** `src/store/types.ts`, `src/store/useAppStore.ts`, `src/pages/Index.tsx`, `src/components/home/cards/PerformanceSettings.tsx`, `src/components/Scene3D.tsx`, `src/components/build/BuildScene3D.tsx`
**New file:** `src/components/home/PerformanceHUD.tsx`

---

## 🟢 Phase 10 — Climate & Comfort Engine ✅

### 10.1 Comfort Engine

- `useComfortEngine` hook: evaluates rules every 30 s against live HA sensor data
- Supports `above`/`below` conditions with threshold + hysteresis
- Device actions: on/off/percentage
- Activity feed logging on rule triggers
- 30-minute override button pauses all automation

### 10.2 Climate Tab

- Regeleditor: sensor selection, target device, time-of-day schedule
- Live comfort status from active sensors
- Category registered in `DashboardGrid`

**Files modified:** `src/store/types.ts`, `src/store/useAppStore.ts`, `src/components/home/DashboardGrid.tsx`, `src/pages/Index.tsx`
**New files:** `src/hooks/useComfortEngine.ts`, `src/components/home/cards/ClimateTab.tsx`
