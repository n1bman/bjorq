

# Graphics Settings — Consolidation & Calibration Plan

## Current State

Graphics-related controls are scattered across **4 separate settings panels** in 3 different sections:

| Panel | Section | Controls |
|-------|---------|----------|
| `PerformanceSettings` | System | Quality preset, shadows, postprocessing, tablet mode, max lights, HUD |
| `LocationSettings` | Anslutning | Live weather toggle, HA weather toggle, lat/lon, address search |
| `DisplaySettings` | Skärm | Fullscreen, kiosk mode, marker size |
| *(Scene3D inline)* | — | Sun position → ambient/directional light, day/night, weather dimming (hardcoded, no UI) |

The `EnvironmentState` type already holds sun azimuth/elevation, weather condition, precipitation override, time mode, and source — but there is **no UI to tune sun calibration, atmosphere, or light intensity**. The Scene3D lighting logic uses hardcoded values with no user-configurable offsets.

---

## Plan: New "Grafik & Miljö" Settings Section

Replace the current `PerformanceSettings` panel and the environment-related parts of `LocationSettings` with a single new section in the settings layout. `LocationSettings` keeps only the address/coordinates — weather source moves to the new section.

### New section in `DashboardGrid.tsx` SettingsCategory

```text
Profil
Utseende
Skärm
Grafik & Miljö        ← NEW (replaces "System > PerformanceSettings")
  ├─ GraphicsSettings       (rendering controls)
  ├─ SunCalibrationPanel    (sun & daylight)
  ├─ WeatherAtmospherePanel (weather & atmosphere)
  └─ EnvironmentPanel       (ground, vegetation, sky)
System
  └─ SystemStatusCard       (PerformanceSettings removed from here)
Anslutning
  └─ HAConnectionPanel, LocationSettings (stripped of weather source), WifiPanel
Data
```

### Store Changes (`types.ts`)

Extend `EnvironmentState` with calibration fields:

```typescript
export interface SunCalibration {
  northOffset: number;       // degrees — rotates sun path to match house orientation
  azimuthCorrection: number; // degrees — fine-tune azimuth
  elevationCorrection: number; // degrees — fine-tune elevation
  intensityMultiplier: number; // 0.0–2.0 (default 1.0)
  indoorBounce: number;      // 0.0–1.0 — fill light intensity inside rooms
}

export interface AtmosphereSettings {
  fogEnabled: boolean;
  fogDensity: number;       // 0.0–1.0
  cloudinessAffectsLight: boolean;
  dayNightTransition: 'smooth' | 'instant';
  atmosphereIntensity: number; // 0.0–2.0
}

// Add to EnvironmentState:
export interface EnvironmentState {
  // ... existing fields ...
  sunCalibration: SunCalibration;
  atmosphere: AtmosphereSettings;
  skyStyle: 'auto' | 'gradient' | 'solid';
}
```

Extend `PerformanceSettings` type:

```typescript
export interface PerformanceSettings {
  // ... existing fields ...
  antialiasing: boolean;     // currently derived from quality, make explicit
  toneMapping: boolean;      // new
  exposure: number;          // 0.5–2.0, default 1.0
  environmentLight: boolean; // drei Environment preset toggle
}
```

### New Components

**1. `GraphicsSettings.tsx`** — Replaces current `PerformanceSettings.tsx`

Contains:
- Quality preset (low/medium/high) + tablet mode
- Shadows on/off + shadow quality (auto from preset)
- Postprocessing on/off
- Anti-aliasing on/off
- Tone mapping + exposure slider
- Environment light on/off
- Max lights slider
- Performance HUD toggle
- Performance score indicator (kept from current)
- Device info line (kept from current)

**2. `SunCalibrationPanel.tsx`** — New

Contains:
- Source toggle: Live (HA/Open-Meteo) vs Manual
- When live: North offset slider (0–360°), azimuth correction (±30°), elevation correction (±15°)
- When manual: Time-of-day slider, season selector
- Sunlight intensity multiplier (0–2×)
- Indoor bounce light slider (0–1)
- Preview: current computed azimuth/elevation readout

**3. `WeatherAtmospherePanel.tsx`** — New

Contains:
- Weather source toggle (moved from `LocationSettings`): Live HA / Live Open-Meteo / Manual
- Manual weather condition picker (clear/cloudy/rain/snow)
- Precipitation override (auto/rain/snow/off) — already exists in store
- Cloudiness affects scene light toggle
- Fog/haze toggle + density slider
- Atmosphere intensity slider
- Day/night transition mode (smooth/instant)

**4. `EnvironmentPanel.tsx`** — New

Contains:
- Ground type (grass/concrete/earth — from existing terrain)
- Vegetation on/off + tree controls (from existing terrain)
- Sky/background style selector
- Environment detail toggle

### Scene3D Changes

Update `SceneContent` in `Scene3D.tsx` to read the new calibration values:

```typescript
// Apply calibration offsets to raw sun position
const calibration = useAppStore((s) => s.environment.sunCalibration);
const rawAz = useAppStore((s) => s.environment.sunAzimuth);
const rawEl = useAppStore((s) => s.environment.sunElevation);

const finalAz = rawAz + calibration.northOffset + calibration.azimuthCorrection;
const finalEl = rawEl + calibration.elevationCorrection;
const sunIntensityBase = /* existing calculation */ ;
const sunIntensity = sunIntensityBase * calibration.intensityMultiplier;

// Indoor bounce fill light
{calibration.indoorBounce > 0 && (
  <pointLight position={[0, 3, 0]} intensity={calibration.indoorBounce * 0.3} color="#fff5e0" />
)}

// Fog
{atmosphere.fogEnabled && <fog attach="fog" args={['#c8d0d8', 20, 60 - atmosphere.fogDensity * 40]} />}

// Tone mapping + exposure via gl settings
```

### Cleanup: What Moves Where

| Current location | What | Destination |
|---|---|---|
| `PerformanceSettings` (System) | All content | `GraphicsSettings` (Grafik & Miljö) |
| `LocationSettings` (Anslutning) | Weather source toggles | `WeatherAtmospherePanel` (Grafik & Miljö) |
| `LocationSettings` (Anslutning) | Address, lat/lon, timezone | Stays in `LocationSettings` |
| Scene3D hardcoded values | Ambient intensity, sun intensity multipliers | Configurable via `SunCalibration` + `AtmosphereSettings` |

### `useWeatherSync` Changes

Apply `sunCalibration.northOffset` when computing sun position:

```typescript
const { azimuth, elevation } = calculateSunPosition(lat, lon, new Date());
const cal = useAppStore.getState().environment.sunCalibration;
setSunPosition(
  azimuth + cal.northOffset + cal.azimuthCorrection,
  elevation + cal.elevationCorrection
);
```

### Files to Create
- `src/components/home/cards/GraphicsSettings.tsx`
- `src/components/home/cards/SunCalibrationPanel.tsx`
- `src/components/home/cards/WeatherAtmospherePanel.tsx`
- `src/components/home/cards/EnvironmentPanel.tsx`

### Files to Modify
- `src/store/types.ts` — Add `SunCalibration`, `AtmosphereSettings`, extend `EnvironmentState` and `PerformanceSettings`
- `src/store/useAppStore.ts` — Add defaults and actions for new fields
- `src/components/home/DashboardGrid.tsx` — New "Grafik & Miljö" section, remove `PerformanceSettings` from System
- `src/components/home/cards/LocationSettings.tsx` — Remove weather source toggles
- `src/components/Scene3D.tsx` — Read calibration, apply offsets, fog, tone mapping, exposure
- `src/hooks/useWeatherSync.ts` — Apply north/azimuth/elevation corrections
- `server/api/profiles.js` — Add defaults for new fields

### Files to Delete
- `src/components/home/cards/PerformanceSettings.tsx` — Replaced by `GraphicsSettings.tsx`

