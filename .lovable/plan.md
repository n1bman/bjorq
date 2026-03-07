

# Fix: SunCalibrationPanel crash on partial state

## Problem

The `??` fallback on `sunCalibration` only works when the entire object is missing. If the store has a partial object (e.g. `{ northOffset: 0 }` without `intensityMultiplier`), the fallback is skipped and `.toFixed()` is called on `undefined`.

## Fix

**`SunCalibrationPanel.tsx`** — Merge defaults per-property instead of whole-object fallback:

```typescript
const raw = useAppStore((s) => s.environment.sunCalibration);
const cal = {
  northOffset: raw?.northOffset ?? 0,
  azimuthCorrection: raw?.azimuthCorrection ?? 0,
  elevationCorrection: raw?.elevationCorrection ?? 0,
  intensityMultiplier: raw?.intensityMultiplier ?? 1,
  indoorBounce: raw?.indoorBounce ?? 0,
};
```

Also add safe defaults for `sunAz` and `sunEl`:
```typescript
const sunAz = useAppStore((s) => s.environment.sunAzimuth) ?? 0;
const sunEl = useAppStore((s) => s.environment.sunElevation) ?? 0;
```

**`WeatherAtmospherePanel.tsx`** — Same pattern: merge per-property defaults for `atmosphere`.

**`EnvironmentPanel.tsx`** — Already uses `?? 'auto'` for `skyStyle`, should be fine. Verify `terrain` access is also safe.

Three files, defensive per-property defaults.

