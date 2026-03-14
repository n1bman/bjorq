

# Ny ljusarmatur: LED Spotlight (GU10) + version bump → 1.5.1

## Referens
Bilden visar en GU10 LED-spotlight — konisk glaskropp med linstopp och två metallpinnar (GU10-sockel). Samma storlek som LED Lampa (~0.03m radie).

## Ändringar

### 1. `src/store/types.ts` (rad 410)
Utöka `fixtureModel` union med `'led-gu10'`:
```ts
fixtureModel?: 'led-bulb' | 'led-bar' | 'led-spot' | 'led-gu10';
```

### 2. `src/components/devices/DeviceMarkers3D.tsx`
**Defaults** (rad 1227-1231) — lägg till:
```ts
'led-gu10': { intensity: 2.5, distance: 3, angle: Math.PI / 8, penumbra: 0.4 },
```

**3D-geometri** (efter led-spot blocket, rad ~1292) — ny sektion:
- Konisk glaskropp (cylinderGeometry med olika radier top/bottom)
- Linstopp (flat cylinder, emissive)
- Två GU10-pinnar (cylinderGeometry, metallmaterial)
- SpotLight med target nedåt (som led-spot)

### 3. `src/components/build/BuildInspector.tsx`
**Modellväljare** (rad 1248-1252) — lägg till:
```ts
{ value: 'led-gu10' as const, label: 'LED Spotlight', emoji: '🔦' },
```

**Defaults** (rad 1272-1282) — lägg till:
```ts
'led-gu10': { intensity: 2.5, distance: 3, angle: Math.PI / 8, penumbra: 0.4 },
```

**hasSpotAngle** (rad 1287) — inkludera `'led-gu10'` som spotLight-typ (redan exkluderad från listan = korrekt).

### 4. Version bump → 1.5.1
- `package.json` → `"version": "1.5.1"`
- `bjorq_dashboard/config.yaml` → `version: "1.5.1"`
- `README.md` → badge `1.5.1`
- `CHANGELOG.md` → ny `[1.5.1]`-sektion:
  - Ny ljusarmatur: LED Spotlight (GU10) med riktad spotlight
  - Fix: long-press timing på 3D-markörer (clickHandled guard)

## Filändringar

| Fil | Ändring |
|-----|---------|
| `types.ts` | `fixtureModel` union + `'led-gu10'` |
| `DeviceMarkers3D.tsx` | Defaults + 3D-geometri för GU10 |
| `BuildInspector.tsx` | Modellväljare + defaults |
| `package.json` | 1.4.1 → 1.5.1 |
| `config.yaml` | 1.4.1 → 1.5.1 |
| `README.md` | Badge 1.5.1 |
| `CHANGELOG.md` | Ny sektion |

