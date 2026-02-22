

# Enheter som visuella markoerer + Kontrollpanel + Hem-widgets

## Koncept

Enheter i 3D-scenen ar INTE 3D-modeller -- de ar enkla visuella indikatorer:
- **Ljus (light)**: En glodande punkt som faktiskt kastar ljus (PointLight) i scenen. Gul/varm farg. Touch for att sla av/pa.
- **Knapp (switch)**: En liten lysande ring/cirkel pa vaggen/golvet. Bla farg. Touch for att togla.
- **Sensor (sensor)**: En pulserande/blinkande liten prick. Gron farg. Visar status med animation.
- **Klimat (climate)**: En svag glod med cyan farg. Indikerar temperaturzon.

Inga meshes, inga laddade modeller -- bara ljuspunkter, glodeffekter och enkla geometrier (sfarer, ringar).

## Del 1: Uppdatera DeviceMarkers3D -- Interaktiva ljusmarkoerer

Omskriv `src/components/devices/DeviceMarkers3D.tsx` helt:

- **Ljus-typ**: Rendera en faktisk `<pointLight>` med varm farg + en liten emissive sfar. Klick toglar pa/av (intensitet 0 vs full). Nar "pa" sprider den faktiskt ljus i scenen.
- **Knapp-typ**: En liten flat glodande ring. Klick toglar farg (bla = pa, gra = av). Pulsanimation vid toggle.
- **Sensor-typ**: En liten sfar med pulserande animation (scale oscillation via useFrame). Gron glow.
- **Klimat-typ**: En svag, stor, halvtransparent sfar som representerar temperaturzon. Cyan farg.
- Alla enheter ar klickbara via `onClick` pa mesh. Klick uppdaterar en lokal `on/off` state (eller HA-state om kopplad).
- Anvand `useFrame` for pulserande/blinkande animationer pa sensorer.
- Inga Billboard/Text-etiketter med emojis -- bara rena ljuseffekter.

## Del 2: Enheter-flik i Bygge

### types.ts
- Utoka `BuildTab` till `'structure' | 'import' | 'furnish' | 'devices'`
- Lagg till `BuildTool`-varianter: `'place-light' | 'place-switch' | 'place-sensor' | 'place-climate'`
- Lagg till actions: `addDevice(marker: DeviceMarker)`, `removeDevice(id: string)`, `updateDevice(id: string, changes: Partial<DeviceMarker>)`

### BuildTabBar.tsx
- Lagg till fjarde flik: `{ key: 'devices', label: 'Enheter', icon: Lightbulb }`

### BuildLeftPanel.tsx
- Nytt block for `tab === 'devices'`:
  - Knappar for att valja enhetstyp att placera (Ljus, Knapp, Sensor, Klimat)
  - Lista over placerade enheter pa aktiv vaning med ta-bort-knapp
  - Varje enhet visar typ-ikon + position

### Ny: `src/components/build/devices/DevicePlacementTools.tsx`
- Verktygspanel med 4 knappar (en per DeviceKind: light, switch, sensor, climate)
- Klicka for att valja typ, sedan klicka i 2D-canvas/3D for att placera
- Lista placerade enheter med radera-knapp

## Del 3: Kontrollpanel -- Full HA-dashboard

Bygg ut `DashboardGrid.tsx` och skapa nya sektioner:

### Ny: `src/components/home/cards/DevicesSection.tsx`
- Grid med alla placerade enheter, grupperade per rum
- Varje enhet visar: typ-ikon, namn (rum + typ), pa/av-status
- Toggle-switch for att sla av/pa (uppdaterar device state)
- Om kopplad till HA: visa entityId

### Ny: `src/components/home/cards/LocationSettings.tsx`
- Inputfalt for latitud och longitud
- Tidszon-valjare (dropdown)
- Anropar `setLocation(lat, lon)` som redan finns i store
- Visar aktuell plats pa en enkel text-display

### Ny: `src/components/home/cards/HomeWidgetConfig.tsx`
- Checkboxar/toggles for vilka widgets som syns pa Hem-skarmen:
  - Klocka (clock)
  - Vader (weather)
  - Temperatur (temperature)
  - Energi (energy)
- Anvander nya `visibleWidgets` state i store

### Uppdatera: `src/components/home/cards/WeatherWidget.tsx`
- Utoka med vindhastighet (placeholder), luftfuktighet
- Visa platsnamn baserat pa koordinater

### Uppdatera: `src/components/home/cards/EnergyWidget.tsx`
- Utoka med mer statistik (placeholder-data)

### Uppdatera: `src/components/home/DashboardGrid.tsx`
- Lagg till sektioner med rubriker:
  1. Overst: Klocka + Vader + Energi (som nu)
  2. "Enheter" -- DevicesSection
  3. "Installningar" -- LocationSettings + HomeWidgetConfig
- Scrollbar layout med tydliga sektionsrubriker

## Del 4: Hem-vy med konfigurerbara widgets

### types.ts
- Utoka `HomeViewState`:
```
homeView: {
  cameraPreset: CameraPreset;
  visibleWidgets: {
    clock: boolean;
    weather: boolean;
    temperature: boolean;
    energy: boolean;
  }
}
```
- Ny action: `toggleHomeWidget(widget: keyof visibleWidgets)`

### store uppdatering
- Default alla widgets till `true`
- Implementera `toggleHomeWidget`
- Implementera `addDevice`, `removeDevice`, `updateDevice`

### HomeView.tsx
- Rendera flytande widgets VILLKORLIGT baserat pa `visibleWidgets`:
  - Om `clock: true` -> visa ClockWidget flytande overst vanster
  - Om `weather: true` -> visa WeatherWidget overst mitten
  - Om `energy: true` -> visa EnergyWidget overst hoger
- Behal CameraFab och HomeNav

## Del 5: Cleanup

- Ta bort `src/components/devices/DevicesOverlay.tsx` (om den fortfarande finns)
- Saker att `BottomNav.tsx` inte langre anvands (HomeNav ersatter den)

## Implementationsordning

1. Uppdatera `types.ts` (BuildTab, nya BuildTools, HomeViewState med visibleWidgets, nya actions)
2. Uppdatera `useAppStore.ts` (nya actions, default state, device CRUD)
3. Omskriv `DeviceMarkers3D.tsx` (ljuspunkter, interaktiva, animerade -- inga 3D-modeller)
4. Skapa `DevicePlacementTools.tsx`
5. Uppdatera `BuildTabBar.tsx` (lagg till Enheter-flik)
6. Uppdatera `BuildLeftPanel.tsx` (devices tab block)
7. Skapa `DevicesSection.tsx` for Kontrollpanelen
8. Skapa `LocationSettings.tsx`
9. Skapa `HomeWidgetConfig.tsx`
10. Uppdatera `DashboardGrid.tsx` med alla nya sektioner
11. Uppdatera `HomeView.tsx` med villkorliga widgets
12. Cleanup gamla filer

