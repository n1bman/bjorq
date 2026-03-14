

# Per-enhet ljusegenskaper i Design-inspektören

## Problem
Alla armaturer av samma typ (t.ex. LED-spot) delar hårdkodade ljusvärden (intensitet ×2, räckvidd 2.5m, konvinkel π/10). I verkligheten varierar spots och bars i storlek och spridning — användaren behöver kunna justera detta per enhet.

## Lösning

### 1. Utöka `DeviceMarker` i `src/store/types.ts`

Lägg till valfria ljusegenskaper direkt på markören:

```ts
// På DeviceMarker (rad ~411):
lightConfig?: {
  intensity: number;    // multiplier (default per typ: bulb=1, bar=1.5, spot=2)
  distance: number;     // meter (default: bulb=2, bar=3, spot=2.5)
  angle: number;        // radianer, bara spot/bar (default: bar=π/4, spot=π/10)
  penumbra: number;     // 0-1 (default: bar=0.7, spot=0.3)
};
```

### 2. Uppdatera `DeviceMarkers3D.tsx`

I `LightFixtureMarker` och `LightMarker`: läs `marker.lightConfig` med fallback till nuvarande hårdkodade värden.

```ts
const defaults = fixtureModel === 'led-bulb' ? { intensity: 1, distance: 2 }
               : fixtureModel === 'led-bar'  ? { intensity: 1.5, distance: 3, angle: Math.PI/4, penumbra: 0.7 }
               :                                { intensity: 2, distance: 2.5, angle: Math.PI/10, penumbra: 0.3 };
const cfg = { ...defaults, ...marker.lightConfig };
```

Sedan används `brightness * cfg.intensity`, `cfg.distance`, `cfg.angle`, `cfg.penumbra` i respektive `<spotLight>` / `<pointLight>`.

Samma mönster för `LightMarker` (lightType-baserade ljuskällor: ceiling, spot, wall, strip, lightbar).

### 3. Uppdatera `DeviceInspector` i `BuildInspector.tsx`

Under armaturmodell-väljaren (rad ~1267) och ljustyp-väljaren (rad ~1243), lägg till en sektion "Ljusegenskaper" med `SliderWithInput`-kontroller:

- **Intensitet** (0.1–10, steg 0.1, default per typ)
- **Räckvidd** (0.5–15 m, steg 0.1)
- **Konvinkel** (5°–120°, steg 1°) — bara för spot/bar/lightbar/wall
- **Penumbra** (0–1, steg 0.05) — bara för spot/bar/lightbar/wall

Kontrollerna syns för `kind === 'light'` och `kind === 'light-fixture'`.

"Återställ"-knapp sätter `lightConfig` till `undefined` (= tillbaka till defaults).

### Filändringar

| Fil | Ändring |
|-----|---------|
| `src/store/types.ts` | Lägg till `LightConfig` interface + `lightConfig?` på `DeviceMarker` |
| `src/components/devices/DeviceMarkers3D.tsx` | Läs `marker.lightConfig` med fallback i `LightMarker` och `LightFixtureMarker` |
| `src/components/build/BuildInspector.tsx` | Lägg till ljusegenskaps-sliders i `DeviceInspector` |

