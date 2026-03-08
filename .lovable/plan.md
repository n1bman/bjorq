

# HA-Driven Lighting System — Architecture Plan

## Current State

The system has three layers that are partially mixed:

1. **Data sources** (`useWeatherSync.ts`) — reads from HA `liveStates` or Open-Meteo, writes raw weather + sun position directly to store
2. **Store** (`EnvironmentState`) — holds raw values: `sunAzimuth`, `sunElevation`, `weather.condition`, `sunCalibration`, `atmosphere`
3. **Renderer** (`Scene3D.tsx SceneContent`) — reads raw values and computes lighting inline (ambient, sun intensity, hemisphere, fog)

**Problem**: There is no interpretation layer. Scene3D directly maps raw weather condition + sun elevation into light intensities with inline ternaries. No structured "environment profile" exists. Adding more nuance (partly cloudy, dusk color, indoor fill scaling) means more inline logic in the renderer.

---

## Proposed Architecture

```text
┌─────────────────────────┐
│  1. INPUT LAYER          │  useWeatherSync.ts (unchanged role)
│  HA liveStates / API     │  Reads: sun.sun, weather.*, sensor.cloud_coverage
│  Open-Meteo fallback     │  Writes raw data to store
└────────────┬────────────┘
             │ raw: condition, temperature, azimuth, elevation, cloud%
             ▼
┌─────────────────────────┐
│  2. INTERPRETATION       │  NEW: src/lib/environmentEngine.ts
│  Pure function           │  Input: raw env + calibration + atmosphere settings
│  No React / no Three.js  │  Output: EnvironmentProfile (typed struct)
└────────────┬────────────┘
             │ profile: sunIntensity, ambientIntensity, shadowSoftness, ...
             ▼
┌─────────────────────────┐
│  3. STORE                │  environment.profile (derived, stored for reactivity)
│  Computed on every sync  │  Updated by useWeatherSync after setting raw data
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  4. RENDERER             │  Scene3D.tsx reads profile values directly
│  No weather logic here   │  Just: light.intensity = profile.sunIntensity
└─────────────────────────┘
```

---

## 1. Input Layer — What HA Data to Read

Currently reads: `weather.*` entity (state + attributes: temperature, wind_speed, humidity, forecast).

**Add** (in `useWeatherSync.ts` HA branch):
- `sun.sun` entity — state: `above_horizon` / `below_horizon`, attributes: `azimuth`, `elevation`, `next_rising`, `next_setting`
- `sensor.cloud_coverage` or `weather.*.cloud_coverage` attribute (if available) — 0-100%

When HA provides `sun.sun` with real azimuth/elevation, use those directly instead of the calculated approximation. Fall back to the calculation when HA data is unavailable.

**No changes** to Open-Meteo fallback — it already works well.

---

## 2. Interpretation Layer — `src/lib/environmentEngine.ts`

A pure TypeScript module with **no React or Three.js imports**. Single exported function:

```typescript
export interface EnvironmentProfile {
  // Time phase
  phase: 'night' | 'dawn' | 'day' | 'dusk';
  phaseFactor: number;            // 0-1 blend within phase

  // Sun
  sunIntensity: number;           // directional light intensity (0-2)
  sunColor: [number, number, number]; // RGB normalized
  shadowEnabled: boolean;
  shadowSoftness: number;         // 0-1 (maps to shadow bias/radius)

  // Ambient / Fill
  ambientIntensity: number;       // 0-1
  ambientColor: [number, number, number];
  hemisphereIntensity: number;    // 0-1
  hemisphereSkyColor: [number, number, number];
  hemisphereGroundColor: [number, number, number];

  // Indoor
  indoorFillIntensity: number;    // 0-1 — hemisphere + ambient boost for interiors

  // Atmosphere
  fogNear: number;
  fogFar: number;
  fogColor: [number, number, number];
  fogEnabled: boolean;

  // Weather effects
  precipitationType: 'none' | 'rain' | 'snow';
  precipitationIntensity: number; // 0-1
}

export function computeEnvironmentProfile(input: {
  sunAzimuth: number;
  sunElevation: number;
  weatherCondition: WeatherCondition;
  cloudCoverage: number;          // 0-1 (0=clear, 1=overcast)
  calibration: SunCalibration;
  atmosphere: AtmosphereSettings;
  precipitationOverride: PrecipitationOverride;
}): EnvironmentProfile;
```

**Key interpretation rules inside this function:**

| Condition | Sun intensity | Ambient | Hemisphere | Shadow |
|-----------|--------------|---------|------------|--------|
| Clear day | 1.2 × cal.intensity | 0.35 | 0.4 | sharp |
| Partly cloudy | 0.7 × cal | 0.45 | 0.5 | soft |
| Cloudy | 0.25 × cal | 0.55 | 0.6 | very soft / off |
| Rain | 0.15 × cal | 0.5 | 0.55 | off |
| Snow | 0.3 × cal | 0.6 | 0.5 | soft |
| Night | 0 | 0.08 | 0.05 | off |
| Dusk/Dawn | lerp between day and night based on elevation 0-15° | warm tint | — | soft |

Cloud coverage (0-1) interpolates between clear and cloudy profiles when `cloudinessAffectsLight` is enabled.

Indoor fill = `hemisphere * cal.indoorBounce` — already exists conceptually but will be explicit.

---

## 3. Store Changes — `src/store/types.ts`

Add to `EnvironmentState`:

```typescript
export interface EnvironmentState {
  // ... existing fields ...
  cloudCoverage: number;            // 0-1, from HA or estimated from condition
  profile: EnvironmentProfile;      // computed by environmentEngine, stored for reactivity
}
```

Add `cloudCoverage` to weather sync output. Default: estimated from condition (clear=0, partly=0.4, cloudy=0.8, rain=0.9, snow=0.7).

Add store action `setEnvironmentProfile(profile: EnvironmentProfile)`.

In `useWeatherSync`, after setting raw weather/sun data, call `computeEnvironmentProfile()` and store the result. This runs once per sync cycle (every 30s for HA, every 60s for sun update, every 15min for Open-Meteo) — negligible cost.

---

## 4. Renderer Changes — `src/components/Scene3D.tsx`

Replace all inline lighting computation in `SceneContent` with direct reads from `environment.profile`:

```typescript
function SceneContent() {
  const profile = useAppStore((s) => s.environment.profile);
  const perf = useAppStore((s) => s.performance);
  const sunPos = useAppStore((s) => /* existing sun position calc stays */);

  return (
    <>
      <ambientLight
        intensity={profile.ambientIntensity}
        color={new THREE.Color(...profile.ambientColor)}
      />
      <directionalLight
        position={sunPos}
        intensity={profile.sunIntensity}
        color={new THREE.Color(...profile.sunColor)}
        castShadow={perf.shadows && profile.shadowEnabled}
        /* shadow config unchanged */
      />
      <hemisphereLight
        args={[
          new THREE.Color(...profile.hemisphereSkyColor),
          new THREE.Color(...profile.hemisphereGroundColor),
          profile.hemisphereIntensity
        ]}
      />
      {profile.fogEnabled && <fog ... />}
      /* rest unchanged */
    </>
  );
}
```

All weather ternaries, cloud dimming, night checks, twilight checks — **removed from Scene3D**. The engine handles it.

---

## 5. Calibration Layer

Already exists as `SunCalibration`. The engine uses it as input:

- `northOffset` + `azimuthCorrection` → applied to sun position (already done in useWeatherSync)
- `elevationCorrection` → applied to sun position (already done)
- `intensityMultiplier` → scales `sunIntensity` in engine
- `indoorBounce` → scales `hemisphereIntensity` and `indoorFillIntensity` in engine

**No new calibration fields needed** — the existing set covers the user's requirements. The `atmosphere` settings (fogDensity, cloudinessAffectsLight, atmosphereIntensity) also feed into the engine.

---

## 6. Mode System — Live / Live+Calibrated / Manual

Current `source` field: `'ha' | 'manual' | 'auto'`.

This already maps to the three modes:
- **`'ha'`** = Live (HA data) — calibration is always applied (= Live+Calibrated)
- **`'auto'`** = Live (Open-Meteo) — same behavior, different data source
- **`'manual'`** = Manual — user sets condition/time, engine still computes profile

There is no need for a separate "live+calibrated" mode because calibration **always** applies. The calibration sliders simply default to neutral (0 offset, 1.0 multiplier). No UI change needed.

---

## 7. HA Sun Entity Usage

In `useWeatherSync.ts` HA branch, add:

```typescript
const sunEntity = liveStates['sun.sun'];
if (sunEntity) {
  const haAz = sunEntity.attributes.azimuth as number;
  const haEl = sunEntity.attributes.elevation as number;
  if (typeof haAz === 'number' && typeof haEl === 'number') {
    // Use HA's precise sun position instead of calculated
    setSunPosition(
      haAz + cal.northOffset + cal.azimuthCorrection,
      haEl + cal.elevationCorrection
    );
  }
}
```

Also read `cloud_coverage` from weather entity attributes if available.

---

## 8. Settings UI Mapping

No UI redesign. The existing settings panels map cleanly:

| Settings section | Controls | Engine input |
|-----------------|----------|--------------|
| **Rendering** | Quality, shadows, post-processing, tablet mode | `perf.*` (unchanged) |
| **Sol & Dagsljus** | Source selector, north offset, azimuth/elevation correction, intensity, indoor bounce | `calibration.*` → engine input |
| **Väder & Atmosfär** | Live weather toggle, cloud affects light, fog, atmosphere intensity | `atmosphere.*` → engine input |

---

## Implementation Phases

### Phase 1: Environment Engine (core)
- Create `src/lib/environmentEngine.ts` with `computeEnvironmentProfile()` and `EnvironmentProfile` type
- Add `cloudCoverage` and `profile` to `EnvironmentState` in types
- Add `setEnvironmentProfile` action to store

### Phase 2: Wire Engine to Sync
- Update `useWeatherSync.ts` to read `sun.sun` and cloud coverage from HA
- Call `computeEnvironmentProfile()` after each data update and store result
- Estimate `cloudCoverage` from condition when not available from HA

### Phase 3: Simplify Renderer
- Replace all inline lighting logic in `Scene3D.tsx SceneContent` with profile reads
- Remove weather ternaries, night/twilight checks, cloud dimming logic
- Keep sun position calculation (azimuth→xyz conversion) in Scene3D

### Phase 4: Test and tune
- Verify all five weather profiles look correct visually
- Tune the numeric values in the engine lookup table
- Confirm no performance regression (engine runs ~once/minute, zero render cost)

### Files

| File | Change |
|------|--------|
| `src/lib/environmentEngine.ts` | **NEW** — pure function, profile computation |
| `src/store/types.ts` | Add `cloudCoverage`, `profile` to `EnvironmentState`, add `EnvironmentProfile` type |
| `src/store/useAppStore.ts` | Add `setEnvironmentProfile` action, add defaults for new fields |
| `src/hooks/useWeatherSync.ts` | Read `sun.sun` + cloud coverage, call engine after sync |
| `src/components/Scene3D.tsx` | Replace inline lighting logic with profile reads |

