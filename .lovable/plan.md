
# Fix: Gizmo-frysning, importerad modell, live-vader och kontrollpanel

## Problem 1: Skärmen fryser vid gizmo-drag

**Orsak**: `onObjectChange` i `TransformControls` anropar `updateDevice` pa varje frame vid drag. Detta triggar en Zustand state-uppdatering som orsakar en React re-render, som aterrendderar `TransformControls` -- en oandlig loop som laser browsern.

**Losning**: Byt till `onMouseUp` / `dragging-changed` event istallet for `onObjectChange`. Spara positionen lokalt under drag och committa till store forst nar anvandaren slapper musen.

```text
Drag start --> lagra position lokalt (useRef)
Dragging   --> uppdatera bara Three.js-objektet (ingen React state)
Drag end   --> committa till updateDevice() en gang
```

I `DeviceMarkers3D.tsx`:
- Ta bort `onObjectChange` fran TransformControls
- Lagg till `onMouseUp` som laser objektets position/rotation och anropar `updateDevice` en enda gang
- Anvand `ref` pa TransformControls for att lyssna pa `dragging-changed` event via `useEffect` + `addEventListener`

## Problem 2: Importerad 3D-modell forsvinner vid sidladdning

**Orsak**: Importerade GLB/GLTF-filer lagras som `blob:` URL:er eller `File`-objekt-URL:er. Dessa forsvinner nar sidan laddas om -- de ar temporara. Men URL:en sparas i localStorage (via persist), sa `homeGeometry.imported.url` pekar pa en blob som inte langre existerar.

**Losning**: Nar anvandaren importerar en modell, las filen som base64 eller lagra den i IndexedDB. Vid sidladdning, aterskapa blob-URL:en fran den sparade datan.

I `useAppStore.ts`:
- Lagg till ett `fileData` falt (base64-strang) i `ImportedHomeSettings`
- Nar modell importeras: las filen som base64 och spara bade `url` och `fileData`
- I store-initiering (eller i `ImportedHome3D`): om `url` ar en blob som inte langre ar giltig men `fileData` finns, aterskapa blob-URL:en

I `ImportedHome3D.tsx`:
- Lagg till en `useEffect` som kontrollerar om URL:en ar giltig, och om inte, aterskap den fran `fileData`

## Problem 3: Live-vader baserat pa plats

**Orsak**: Vadret ar manuellt (clear/cloudy/rain/snow via knappar). Ingen koppling till riktiga vaderdata.

**Losning**: Anvand OpenMeteo (gratis, inget API-nyckel) for att hamta aktuellt vader baserat pa lat/lon fran `environment.location`.

Skapa `src/hooks/useWeatherSync.ts`:
- Hamta vader fran `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true`
- Mappa WMO-vaderkod till `WeatherCondition`: kod 0-3 = clear/cloudy, 51-67/80-82 = rain, 71-77/85-86 = snow
- Uppdatera `setWeather()` med resultat
- Polla var 15:e minut
- Aktivera bara nar `environment.source === 'ha'` eller nytt `'auto'` lage

I `EnvironmentState`:
- Lagg till `source: 'manual' | 'auto'` (auto = live vader)

I `BuildTopToolbar.tsx` och kontrollpanelen:
- Lagg till en toggle for "Live vader" som satter source till 'auto'

## Problem 4: Kontrollpanel -- kategori-baserad navigation

**Inspiration fran referensbilden**: En ikon-banner langs toppen med kategorier (hem, vader, enheter, sol, batteri, etc), och varje kategori visar relevant innehall.

**Losning**: Omstrukturera `DashboardGrid.tsx` med en horisontell ikon-nav langs toppen (liknande referensbilden), och varje kategori visar en specifik vy:

```text
Kategorier (ikon-banner):
[Home] [Weather] [Devices] [Energy] [Solar] [Settings] [HA]
```

- **Home**: Oversikt med klocka, vader-sammanfattning, snabbtoggle for enheter
- **Weather**: Detaljerad vader-widget (temp, vind, fuktighet, prognos)
- **Devices**: Alla enheter grupperade per rum med toggle
- **Energy**: Energi-statistik (placeholder for solpaneler, forbrukning etc)
- **Settings**: Plats, widget-konfiguration
- **HA**: Home Assistant-koppling

I `DashboardGrid.tsx`:
- Lagg till en `useState` for aktiv kategori
- Rendera en ikon-rad langs toppen
- Villkorligt rendera innehall baserat pa vald kategori
- Varje kategori ar en egen sektion/komponent

## Tekniska detaljer

### DeviceMarkers3D.tsx -- Gizmo-fix
```tsx
// Byt fran onObjectChange till dragging-changed event
const tcRef = useRef<any>(null);

useEffect(() => {
  const tc = tcRef.current;
  if (!tc) return;
  const handler = (event: any) => {
    if (!event.value && tc.object) {
      // Drag avslutad -- committa
      const obj = tc.object;
      updateDevice(marker.id, {
        position: [obj.position.x, obj.position.y, obj.position.z],
        rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      });
    }
  };
  tc.addEventListener('dragging-changed', handler);
  return () => tc.removeEventListener('dragging-changed', handler);
}, [marker.id, updateDevice]);

<TransformControls ref={tcRef} mode={transformMode} size={0.6}
  position={marker.position}>
  ...
</TransformControls>
```

### types.ts -- ImportedHomeSettings
```typescript
interface ImportedHomeSettings {
  // ... befintliga falt
  fileData?: string; // base64-kodad GLB/GLTF
}
```

### useWeatherSync.ts
```typescript
// Open-Meteo API (gratis, inget API-nyckel)
// GET https://api.open-meteo.com/v1/forecast?latitude=59.33&longitude=18.07&current_weather=true
// Svaret innehaller: weathercode, temperature, windspeed
```

### DashboardGrid.tsx -- Kategori-navigation
```text
Ikon-rad: [Home] [Weather] [Devices] [Energy] [Settings] [HA]
     |
     v
  Villkorligt innehall baserat pa vald kategori
```

### Implementationsordning
1. Fixa gizmo-frysningen i `DeviceMarkers3D.tsx` (byt till dragging-changed event)
2. Fixa importerad modell-persistens i `types.ts`, `useAppStore.ts`, och `ImportedHome3D.tsx`
3. Skapa `useWeatherSync.ts` med Open-Meteo-integration
4. Uppdatera `EnvironmentState` med auto-lage
5. Omstrukturera `DashboardGrid.tsx` med kategori-navigation
6. Uppdatera `BuildTopToolbar.tsx` med live-vader-toggle
