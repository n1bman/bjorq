

# Fix: SunCalibrationPanel & WeatherAtmospherePanel crashes

## Problem

Both panels read `s.environment.sunCalibration` and `s.environment.atmosphere` directly from the store without fallbacks. When the app loads with persisted/legacy state that lacks these new fields, the values are `undefined`, causing the crash on `northOffset` / `cloudinessAffectsLight` access. This blocks the entire Settings page from rendering — which is why the user cannot see the "Grafik & Miljö" section at all.

The previous fix only added fallbacks in `Scene3D.tsx` but not in the two settings panels.

## Fix

Add defensive fallback defaults in both panel components, identical to the approach used in Scene3D:

**`SunCalibrationPanel.tsx`** (line 9):
```typescript
const cal = useAppStore((s) => s.environment.sunCalibration) 
  ?? { northOffset: 0, azimuthCorrection: 0, elevationCorrection: 0, intensityMultiplier: 1, indoorBounce: 0 };
```

**`WeatherAtmospherePanel.tsx`** (line ~30 where `atm` is read):
```typescript
const atm = useAppStore((s) => s.environment.atmosphere) 
  ?? { fogEnabled: false, fogDensity: 0.3, cloudinessAffectsLight: true, dayNightTransition: 'smooth', atmosphereIntensity: 1.0 };
```

**`EnvironmentPanel.tsx`** — add fallback for `skyStyle`:
```typescript
const skyStyle = useAppStore((s) => s.environment.skyStyle) ?? 'auto';
```

Two files changed, one line each. No structural changes needed.

