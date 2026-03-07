

# Fix: Kvarvarande `northOffset`-krasch + mörk scen

## Problem 1 — Krasch i `useWeatherSync.ts`

Filen `src/hooks/useWeatherSync.ts` läser `sunCalibration` direkt utan fallback på rad 145 och 172:

```typescript
const cal = useAppStore.getState().environment.sunCalibration;
setSunPosition(azimuth + cal.northOffset + ...);
```

Om persisted state saknar `sunCalibration` kraschar appen vid uppstart — innan panelerna ens renderas. Detta är källan till felet på den publicerade versionen.

## Problem 2 — Mörkt som standard

Standardelevationen (`sunElevation: 45`) sätts i initial state, men `useWeatherSync` körs direkt vid uppstart och beräknar solposition baserat på faktisk tid och plats (Stockholm). Om det är kväll/natt lokalt blir scenen mörk — det är korrekt beteende, men kan vara förvirrande.

Ingen kodändring behövs för detta — det är "working as designed" med live-synk aktiverat.

## Fix

**`src/hooks/useWeatherSync.ts`** — Lägg till defensiv fallback på båda ställen (rad 145 och 172):

```typescript
const cal = useAppStore.getState().environment.sunCalibration
  ?? { northOffset: 0, azimuthCorrection: 0, elevationCorrection: 0, intensityMultiplier: 1, indoorBounce: 0 };
```

En fil, två rader ändrade. Samma mönster som redan används i `Scene3D.tsx`.

