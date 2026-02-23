

# Fix: Skarm (media_screen) placeras med fel kind och saknar specialegenskaper

## Rotorsak

Nar man klickar for att placera en skarm gor koden pa rad 756 i `BuildCanvas2D.tsx`:
```
const kind = activeTool.replace('place-', '') // 'place-media-screen' -> 'media-screen'
```

Men DeviceKind-typen anvander **understreck**: `media_screen`. Darfor sparas enheten med `kind: 'media-screen'` (bindestreck) som inte matchar nagon komponent, ikon eller inspektorlogik. Det ar darfor:

- Inspektorn visar lampikon istallet for monitor-ikon
- Skarmspecifika kontroller (bredd, bildformat) visas inte
- 3D-markoren faller igenom till `markerComponents['media-screen']` som ar `undefined` och returnerar `null`

## Losning

### 1. BuildCanvas2D.tsx -- Konvertera kind korrekt (rad 756)

Lagg till en mapping fran tool-namn till korrekt DeviceKind, eller ersatt bindestreck med understreck for `media-screen`:

```tsx
const rawKind = activeTool.replace('place-', '');
const kind = rawKind === 'media-screen' ? 'media_screen' : rawKind as DeviceKind;
```

### 2. BuildCanvas2D.tsx -- Satt default-egenskaper for media_screen (rad 766-774)

Nar `kind === 'media_screen'`, satt:
- `surface: 'free'` istallet for `'floor'`
- `scale: [1.2, 0.675, 1]` (default TV-storlek)
- `screenConfig: { aspectRatio: 16/9, uiStyle: 'minimal', showProgress: true }`
- `position[1]` till vagg-hojd (t.ex. `elev + 1.5`) istallet for tak-hojd

### 3. BuildInspector.tsx -- Skarmspecifika kontroller redan implementerade

Inspektorn har redan all logik for `isScreen` (bredd-slider, bildformat, UI-stil, rotation XYZ). Den fungerar korrekt sa fort `device.kind` ar `'media_screen'`.

## Tekniska detaljer

| Fil | Andring |
|-----|---------|
| `BuildCanvas2D.tsx` rad 756 | Fixa kind-konvertering fran `media-screen` till `media_screen` |
| `BuildCanvas2D.tsx` rad 766-774 | Lagg till specialfall for `media_screen` med ratt default-egenskaper |

Inga nya filer eller beroenden kravs.
