
# Enhetsplacering, namngivning och HA-koppling

## Problem

1. **Placering fungerar inte** -- `place-light`, `place-switch`, `place-sensor`, `place-climate` verktyg finns i UI:t men varken 2D-canvas eller 3D-scen hanterar klick med dessa verktyg. Ingen kod skapar faktiska `DeviceMarker` vid klick.
2. **Inget namn** -- `DeviceMarker`-typen saknar `name`-falt. Man kan inte ge enheter eget namn.
3. **Ingen hojdjustering** -- efter placering finns inget satt att andra Y-position (hojd).
4. **Ingen HA-koppling i UI** -- det finns en `ha.entityId` i typen men inget satt att stalla in den. Ingen HA-anslutningspanel i kontrollpanelen.

## Andringar

### 1. Uppdatera `DeviceMarker` i `types.ts`
- Lagg till `name: string` falt (ex: "Taklampa kok")

### 2. Hantera `place-*` verktyg i `BuildCanvas2D.tsx`
Lagg till en ny sektion i `handlePointerDown` (runt rad 660, efter stairs-hantering):

```
if (activeTool.startsWith('place-') && activeFloorId) {
  const kind = activeTool.replace('place-', '') as DeviceKind;
  const [wx, wz] = screenToWorld(sx, sy);
  const snapped = snapToGrid(wx, wz);
  const floor = floors.find(f => f.id === activeFloorId);
  addDevice({
    id: generateId(),
    kind,
    floorId: activeFloorId,
    surface: 'floor',
    position: [snapped[0], floor?.elevation ?? 0 + 2.2, snapped[1]],
    rotation: [0, 0, 0],
    name: '',
  });
  return;
}
```

Lampor placeras pa takhojd (elevation + heightMeters - 0.1), sensorer/knappar pa vagghojd (1.2m).

### 3. Hantera `place-*` verktyg i `BuildScene3D.tsx`
Samma logik i `handleGroundPointerDown` -- nar `activeTool.startsWith('place-')`, skapa markorer vid klickpunkten i 3D.

### 4. Rita enheter i 2D-canvasen
Lagg till en draw-sektion i `BuildCanvas2D`s renderingsloop (efter "Draw props as icons") som ritar placerade enheter som fargade cirklar pa ratt position:
- Ljus: gul cirkel
- Knapp: bla cirkel
- Sensor: gron cirkel
- Klimat: cyan cirkel
- Visa namn bredvid om satt

### 5. Enhetsinspektar i `BuildInspector.tsx`
Lagg till `selection.type === 'device'` i inspektorn:
- Textfalt for **namn** (updateDevice)
- Slider for **hojd (Y)** (updateDevice position[1])
- Dropdown for **yta** (floor/wall/ceiling)
- Input for **HA Entity ID** (updateDevice ha.entityId)
- Ta-bort-knapp

### 6. Uppdatera `BuildSelection` i `types.ts`
Lagg till `'device'` i `BuildSelection.type`:
```
type: 'wall' | 'opening' | 'room' | 'prop' | 'stair' | 'device' | null
```

### 7. Klickbar enhetsval i 2D-canvas
I select-verktygets klickhantering (runt rad 722), lagg till kontroll for enhetsmarkoerer fore props:
- Hitt devices nara klickpunkten
- Satt `selection: { type: 'device', id: marker.id }`

### 8. HA-anslutningspanel i Kontrollpanelen
Skapa `src/components/home/cards/HAConnectionPanel.tsx`:
- Input for WebSocket-URL (ws://homeassistant.local:8123/api/websocket)
- Input for Long-lived access token
- Anslut/Koppla-fran-knapp
- Statusindikator (ansluten/frankopplad/fel)
- Lista over hittade HA-entiteter nar ansluten

### 9. Uppdatera `DashboardGrid.tsx`
Lagg till HA-anslutningspanelen i Installningar-sektionen:
```
<HAConnectionPanel />
```

### 10. Uppdatera `DevicePlacementTools.tsx`
Visa enhetsnamn i listan over placerade enheter (istallet for bara typ).

## Tekniska detaljer

### types.ts andringar
```
interface DeviceMarker {
  // ... existing fields
  name: string;  // NEW
}

interface BuildSelection {
  type: 'wall' | 'opening' | 'room' | 'prop' | 'stair' | 'device' | null;  // add 'device'
  id: string | null;
}
```

### Implementationsordning
1. Uppdatera `types.ts` (DeviceMarker.name, BuildSelection.type)
2. Uppdatera `BuildCanvas2D.tsx` (hantera place-* i pointerDown + rita enheter + select enheter)
3. Uppdatera `BuildScene3D.tsx` (hantera place-* i handleGroundPointerDown)
4. Uppdatera `BuildInspector.tsx` (enhets-inspektar med namn, hojd, HA-koppling)
5. Skapa `HAConnectionPanel.tsx`
6. Uppdatera `DashboardGrid.tsx` med HA-panel
7. Uppdatera `DevicePlacementTools.tsx` med namn-visning
