
# Forbattringar: Enhetslista-markering, vader-begransning, 2D-modell, live-synk

## 1. Klickbar enhetslista i sidomenyn

I `DevicePlacementTools.tsx` -- listan under "PLACERADE" visar enheter men klick markerar dem inte i 3D/2D. Fix: gor varje rad klickbar sa den anropar `setSelection({ type: 'device', id: m.id })`. Lagg aven till visuell markering (highlight) for den valda enheten.

## 2. Vader-partiklar bara runt huset (inte over/i)

I `WeatherEffects3D.tsx` -- partiklarna spawnar i en ring (MIN_RADIUS=6 till 20m), men de faller fran Y=20 ned till Y=0 -- de passerar genom taket. Fix:
- Begr ansa max-hojden till husets takhojd (t.ex. aktiva vaningens elevation + heightMeters, default ~3m)
- Partiklar spawnar bara upp till 5-6 meter over marken sa de ser ut att falla utanfor vaggarna
- Halla MIN_RADIUS sa de inte dyker upp inne i huset

## 3. Importerad modell i 2D-planvyn

I `BuildCanvas2D.tsx` -- importerade 3D-modeller visas inte i 2D-vyn. Fix:
- Nar `homeGeometry.source === 'imported'` och modellen har en bounding box, rita en rektangel/kontur i 2D-planvyn som representerar modellens fotavtryck
- Anvand `imported.position` och `imported.scale` for att berakna storleken
- Rita som en streckad rektangel med label "Importerad modell"

## 4. Live-synkronisering av vaderintensitet

I `useWeatherSync.ts` -- WMO-koder mappas bara till 4 kategorier (clear/cloudy/rain/snow), men intensiteten skiljer sig inte. For att regn/sno ska "matcha" verkligheten behovs en intensitetsfaktor.

### Andringar i typer och store:
- Lagg till `intensity: number` (0-1) i `weather`-objektet i `EnvironmentState`
- Latt regn (WMO 51) = 0.3, mattligt (61) = 0.6, kraftigt (65) = 1.0
- Latt sno (71) = 0.3, mattlig (73) = 0.6, kraftig (75) = 1.0

### Andringar i WeatherEffects3D:
- Anvand `intensity` for att skala antalet partiklar: `count = baseCount * intensity`
- Regn: baseCount 3000 * intensity
- Sno: baseCount 1500 * intensity

## 5. Sol-position baserad pa tid och plats

I `BuildScene3D.tsx` -- solen styrs manuellt via azimuth/elevation sliders. For live-lage:
- Nar `timeMode === 'live'`, berakna solens position fran aktuell tid + lat/lon
- Enkel solpositionsberakning baserad pa timme pa dygnet och latitud
- Natt = mycket lag elevation (negativ) = morkt

### Andringar:
- Skapa en hjalp-funktion `calculateSunPosition(lat, lon, date): { azimuth, elevation }`
- I `useWeatherSync` eller ett nytt `useSunSync` hook: uppdatera `setSunPosition` var minut nar source ar 'auto'
- Nar elevation ar negativ: reducera sunIntensity till 0 (natt)

## Tekniska detaljer

### DevicePlacementTools.tsx -- klickbar lista
Rad 80: Lagg till `onClick` pa varje enhetsrad:
```tsx
<div onClick={() => setSelection({ type: 'device', id: m.id })}
  className={cn(
    "flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer",
    selectedId === m.id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary/20"
  )}>
```

### WeatherEffects3D.tsx -- hojdbegransning
Andra max spawn-hojd fran 20 till ~6 meter. Andra respawn-hojd fran 20 till samma. Partiklar faller bara fran takniva ned till mark.

### BuildCanvas2D.tsx -- importerad modell-kontur
Lagg till en draw-funktion som ritar modellens fotavtryck som en streckad rektangel i 2D-vyn nar source ar 'imported'. Storleken baseras pa `imported.scale` och en default bounding box (t.ex. 10x10m skalat).

### types.ts -- intensity
```typescript
weather: {
  condition: WeatherCondition;
  temperature: number;
  windSpeed?: number;
  humidity?: number;
  intensity: number; // 0-1, hur kraftigt regn/sno
}
```

### useWeatherSync.ts -- intensitetsmappning
```typescript
function wmoToIntensity(code: number): number {
  // Latt: 0.3, Mattlig: 0.6, Kraftig: 1.0
  if ([51, 56, 71, 85, 80].includes(code)) return 0.3;
  if ([53, 57, 73, 61, 81].includes(code)) return 0.6;
  if ([55, 67, 75, 65, 82, 77, 86].includes(code)) return 1.0;
  return 0;
}
```

### Solpositionsberakning
Enkel approximation baserad pa timme och latitud:
```typescript
function calculateSunPosition(lat: number, lon: number, date: Date) {
  const hour = date.getHours() + date.getMinutes() / 60;
  const dayOfYear = /* ... */;
  const declination = 23.45 * Math.sin((360/365) * (dayOfYear - 81) * Math.PI/180);
  const hourAngle = (hour - 12) * 15;
  const elevation = Math.asin(
    Math.sin(lat*D2R)*Math.sin(declination*D2R) +
    Math.cos(lat*D2R)*Math.cos(declination*D2R)*Math.cos(hourAngle*D2R)
  ) * R2D;
  const azimuth = /* atan2-berakning */;
  return { azimuth, elevation };
}
```

### Implementationsordning
1. Lagg till `intensity` i `EnvironmentState` och `setWeatherData` i types/store
2. Uppdatera `useWeatherSync.ts` med intensitetsmappning och solpositionsberakning
3. Uppdatera `WeatherEffects3D.tsx` med intensitetsbaserat partikelantal och hojdbegransning
4. Uppdatera `BuildScene3D.tsx` for att anvanda live-solposition nar source ar 'auto'
5. Uppdatera `DevicePlacementTools.tsx` med klickbar enhetslista
6. Uppdatera `BuildCanvas2D.tsx` med importerad modell-kontur i 2D
