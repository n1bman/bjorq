

# Fullstandig granskning och forbattringsplan for HomeTwin

## Sammanfattning av vad som finns

Appen ar uppdelad i tre lager -- **Hem** (3D-vy med widgets), **Kontrollpanel** (dashboard med kategorier) och **Bygge** (konstruktionsverktyg). Nedan foljer en genomgang av allt som fungerar, allt som saknas eller har buggar, och en atgardsplan.

---

## Vad som fungerar bra

- **Tre applagen** (Hem / Kontrollpanel / Bygge) med navigering via pill-nav
- **Bygglagets 4 flikar**: Struktur, Importera, Moblera, Enheter
- **2D-planvy** med grid, vagger, rum, dorrar, fonster, trappor, props, enhetsmarorer
- **3D-vy** med vagger, golv, tak, trappor, importerade modeller, props, enheter
- **Fullstandig vaggritning** (2D med noder, snapping, dubbelklick for att avsluta)
- **Rum** fran rektangel-drag och automatisk detektion
- **Dorrar/fonster** med placering, storlek, brostningshojd, drag langs vagg
- **Inspector** for vagger, rum, trappor, props, enheter, oppningar
- **Material/malning** for rum (golv och vagg)
- **Importerade 3D-modeller** med position, rotation, skala, nordvinkel
- **Modellpersistens** via base64 i localStorage (overlever sidladdning)
- **Moblering** med katalog, placering, drag i bade 2D och 3D
- **Enhetsplacering** med 12 typer, klickbar lista, drag i 3D
- **Undo/redo** for layoutandringar
- **Vader** med live-synk fran Open-Meteo (temperatur, vind, fuktighet, intensitet)
- **Solposition** som automatiskt beraknas fran lat/lon och tid
- **Vadereffekter** (regn/sno-partiklar) med intensitetsbaserat antal
- **Kontrollpanel** med 6 kategorier och innnehalten organiserat
- **Home Assistant** anslutningsformular (stub)
- **Widgets** (klocka, vader, energi) pa hemskarm med konfigurering

---

## Problem och brister som behover ataardas

### 1. BUGG: Enhetslistans radering propagerar markering

I `DevicePlacementTools.tsx` rad 87-92: klick pa **Radera-knappen** (Trash2) bubblar upp till foralderns `onClick` som markerar enheten -- sa nar man trycker radera markeras enheten forst, sen raderas den. Behover `e.stopPropagation()` pa radera-knappen.

### 2. BUGG: Enheter kan inte dras i 2D-planvyn

I `BuildCanvas2D.tsx` finns ingen drag-logik for enhetsmarorer i 2D-vyn. Man kan markera dem (rad 827-834), men inte flytta dem med musen. Det saknas `dragDevice`-state och drag-hantering under `handlePointerMove`.

### 3. BUGG: Vaderpartiklar spawnar i 40x40m omrade men MIN_RADIUS ar 6m

Partiklarna spawnar i en ring 6-20m fran centrum, men `(Math.random() - 0.5) * 40` ger -20 till +20. Maxradien ar ~28m diagonalt. Det ar onodigt stort -- particles far utanfor synfaltet. Bor begransas till ~15m radie for battre densitet.

### 4. SAKNAS: "Temperatur"-widget existerar i konfigurationen men renderas aldrig

I `HomeWidgetConfig.tsx` finns alternativet "Temperatur" (`temperature`), men i `HomeView.tsx` renderas ingen "TemperatureWidget" nar `visibleWidgets.temperature` ar sant. Det ar en dod toggle.

### 5. SAKNAS: Kamera-presets gor ingenting i Home-vyn

`CameraFab.tsx` satter `cameraPreset` i store, men `Scene3D.tsx` (Home-vyns 3D-scen) lyssnar aldrig pa det vardet. Kameran ar alltid i samma position oavsett valt preset.

### 6. SAKNAS: Enhetstogglar i dashboard gor ingenting pa riktigt

`DevicesSection.tsx` har Switch-knappar for ljus/switch, men de styr bara lokal React-state (`toggledOn`). De kopplar inte till marker-tillstandet eller visuell feedback i 3D-scenen (t.ex. tanda/slacka ljus).

### 7. SAKNAS: "Copy"-verktyget ar inaktivt

`BuildTopToolbar.tsx` visar en "Kopiera"-knapp som satter verktyget till `copy`, men inget handlar pa det i `BuildCanvas2D.tsx` eller `BuildScene3D.tsx`. Klick med copy-verktyget gor ingenting.

### 8. SAKNAS: Skalkalibrering ar halvimplementerad

`ScaleCalibration.tsx`-komponenten finns och fungerar, men den renderas aldrig nagononstans i UI:t. Nar man klickar "Skala" i verktygsmenyn sker inget visuellt (ingen panel oppnas). Kalibrering-logiken i `BuildCanvas2D.tsx` hanterar inte `calibrate`-verktyget.

### 9. FORBATTRING: 2D-modellens fotavtryck ar statiskt 10x10m

I `BuildCanvas2D.tsx` rad 506-507: fotavtrycket beraknas som `10 * scale[0]` och `10 * scale[2]`. Siffran 10 ar hardkodad. Om modellen egentligen ar 5x8m visar den fel storlek. Bor anvanda den faktiska bounding box fran modellen.

### 10. FORBATTRING: Props tappar URL vid sidladdning

Precis som importerade modeller lagrar props en `blob:` URL. Men till skillnad fran importerade modeller sparas ingen `fileData` for props. Nar sidan laddas om forsvinner alla moblerade props. Samma fix behovs for prop-katalogen.

### 11. FORBATTRING: Nattscen saknar visuell natt-effekt

Nar solen ar under horisonten satter `BuildScene3D.tsx` `sunIntensity` till 0, men ambientLight ar fortfarande 0.35 och Environment-preset ar alltid "night". Det saknas visuella skillnader for dag/natt/skymning (t.ex. himmelsfarg, morkare ambient, stjarnor).

### 12. FORBATTRING: HA-anslutning ar bara en stub

`HAConnectionPanel.tsx` simulerar anslutning med `setTimeout`. Ingen riktig WebSocket-kommunikation. Det ar forvant, men bor markeras tydligt for anvandaren.

---

## Atgardsplan (prioritetsordning)

### Fas 1: Buggfixar (kritiskt)

**1a. Radera-knapp propagation i DevicePlacementTools.tsx**
- Lagg till `onClick={(e) => { e.stopPropagation(); removeDevice(m.id); }}` pa Trash2-knappen

**1b. Enhets-drag i 2D-planvyn**
- Lagg till `dragDevice`-state i `BuildCanvas2D.tsx`
- I `handlePointerDown` under select-verktyget, nar en enhet traffas, starta drag med offset
- I `handlePointerMove`, flytta enheten via `updateDevice`
- I `handlePointerUp`, avsluta drag

**1c. Vader-partikelradie**
- Minska spawn-omradet i `WeatherEffects3D.tsx` fran 40 till 30 (radie 15m) for battre densitet

### Fas 2: Doda funktioner (saknat UI)

**2a. Kamera-presets i Home-vyn**
- I `Scene3D.tsx`, las `cameraPreset` fran store
- Anvand `useFrame` for att interpolera kameran mot ratt position:
  - `free`: ingen styrning (OrbitControls)
  - `topdown`: position [0, 25, 0], riktad nedot
  - `angle`: position [12, 12, 12]
  - `front`: position [0, 6, 20]

**2b. Temperatur-widget**
- Skapa `TemperatureWidget.tsx` som visar inomhus/utomhustemperatur
- Alternativt: ta bort togglen fran `HomeWidgetConfig.tsx` om det inte ar relevant
- Enklaste losningen: visa utomhustemperaturen fran vader-datan som en separat widget

**2c. Skalkalibrering**
- Rendera `ScaleCalibration.tsx` i `BuildLeftPanel.tsx` nar `activeTool === 'calibrate'`
- Implementera klick-till-punkt i `BuildCanvas2D.tsx` for `calibrate`-verktyget

**2d. Copy-verktyg**
- Alternativ A: Implementera kopiering (klicka objekt, skapa kopia med offset)
- Alternativ B: Ta bort knappen om det inte behovs annu

### Fas 3: Persistensproblem

**3a. Props-persistens**
- Lagg till `fileData: string` i `PropCatalogItem`
- Nar anvandaren laddar upp en prop-modell, las filen som base64 (samma monster som ImportTools.tsx)
- I `Props3D.tsx`, lagg till en `useRestoredUrl`-hook liknande `ImportedHome3D.tsx`

### Fas 4: Visuella forbattringar

**4a. Dag/natt-cykel med visuell feedback**
- Nar solens elevation ar negativ: sank ambient till 0.1, gor himlen morkare
- Nar elevation ar 0-15: skymning/gryning-farg (orange ambient)
- Nar elevation ar 15+: full dag

**4b. Enhetstogglar i dashboard styr 3D-scenen**
- Lagg till `deviceStates: Record<string, boolean>` i devices-lagret
- Nar en toggle andras i DevicesSection, uppdatera deviceStates
- I `DeviceMarkers3D.tsx`, las deviceStates och anvand for att tanda/slacka ljus

**4c. Battre modell-fotavtryck i 2D**
- Spara modellens bounding box nar den laddas i `ImportedHome3D.tsx`
- Anvand den i `BuildCanvas2D.tsx` istallet for hardkodade 10x10m

---

## Tekniska detaljer

### DevicePlacementTools.tsx -- stopPropagation
```tsx
<button
  onClick={(e) => { e.stopPropagation(); removeDevice(m.id); }}
  className="text-destructive/60 hover:text-destructive p-0.5"
>
```

### BuildCanvas2D.tsx -- enhets-drag
Nya state-variabler:
```tsx
const [dragDeviceId, setDragDeviceId] = useState<string | null>(null);
const [dragDeviceOffset, setDragDeviceOffset] = useState<[number, number]>([0, 0]);
```
I handlePointerDown (select-verktyget), nar enhet traffas:
```tsx
setDragDeviceId(dev.id);
setDragDeviceOffset([swx - dev.position[0], swz - dev.position[2]]);
```
I handlePointerMove:
```tsx
if (dragDeviceId && activeFloorId) {
  const dev = deviceMarkers.find(m => m.id === dragDeviceId);
  if (dev) {
    const snapped = snapToGrid(wx - dragDeviceOffset[0], wz - dragDeviceOffset[1]);
    updateDevice(dragDeviceId, { position: [snapped[0], dev.position[1], snapped[1]] });
  }
  return;
}
```

### Scene3D.tsx -- kamera-presets
```tsx
const cameraPreset = useAppStore((s) => s.homeView.cameraPreset);
// I useFrame:
const targetPos = presetPositions[cameraPreset];
camera.position.lerp(targetPos, delta * 2);
```

### Implementationsordning
1. Fas 1a-1c: Buggfixar (radera-propagation, 2D-drag, partikelradie)
2. Fas 2a-2b: Kamera-presets och temperatur-widget
3. Fas 2c-2d: Skalkalibrering och copy-verktyg (eller ta bort)
4. Fas 3a: Props-persistens
5. Fas 4a-4c: Visuella forbattringar (dag/natt, enhets-toggle, bounding box)

