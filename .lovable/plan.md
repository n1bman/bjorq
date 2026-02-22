
# Fix: Ta bort TransformControls, anvand pointer-drag istallet

## Rotorsak

`TransformControls` fran drei konfliktar med `OrbitControls` som har `LEFT: undefined`. Nar gizmon mountas kapas alla pointer-events, vilket laser bade kameran och gizmon. Detta ar ett kant dokumenterat problem med dessa tva kontroller i kombination.

## Losning

Byt helt fran `TransformControls` till en **egen pointer-baserad drag** -- samma monster som redan fungerar perfekt i `Props3D.tsx`. Det innebar:

1. Nar en enhet ar vald i bygglaaget, klicka-och-dra pa markoren for att flytta den langs golv-planet (Y fast)
2. Rotation hanteras via inspektorns sliders (redan implementerat)
3. Ta bort `TransformControls`-importen helt

## Andringar

### `DeviceMarkers3D.tsx` -- Ersatt SelectedDeviceWithGizmo

- **Ta bort** hela `SelectedDeviceWithGizmo`-komponenten och `TransformControls`-importen
- **Ta bort** modul-globala `_transformMode` / `setDeviceTransformMode` (behovs inte langre)
- **Istallet**: gor varje marker-komponent draggbar nar den ar `selected` och `buildMode` ar aktivt
- Implementera drag via `onPointerDown` pa marker-gruppen:
  - Skapa en horisontell `THREE.Plane` pa enhetens Y-hojd
  - Lyssna pa `pointermove` och `pointerup` via `window`
  - Vid move: raycast mot planet, uppdatera position via `updateDevice`
  - Vid up: sluta lyssna
- Visuell feedback: andra cursor till `grabbing` under drag

### `BuildInspector.tsx` -- Forenkla DeviceInspector

- **Ta bort** "Gizmo-lage" sektionen (Flytta/Rotera-knapparna)
- Behall position X/Y/Z sliders for fininjustering
- Behall rotation som en enkel Y-rotation slider (0-360 grader)
- Ta bort import av `setDeviceTransformMode`

### 2D-laaget (`BuildCanvas2D.tsx`)

- Enheter i 2D behover ingen `TransformControls`. Drag-flytt i 2D ar redan hanterat via canvas pointer events -- kontrollera att det fungerar, annars lagg till pointer-drag for enhetsmarkorerna i 2D-canvas drawDevice/hitDevice.

## Teknisk implementation

### Pointer-drag i DeviceMarkers3D (samma monster som Props3D)

```text
onPointerDown (pa markoren):
  1. stopPropagation()
  2. Skapa Plane(Vector3(0,1,0), -position.y)
  3. Berakna offset = clickPoint - devicePos
  4. window.addEventListener('pointermove', onMove)
  5. window.addEventListener('pointerup', onUp)

onMove:
  1. Raycast fran mouse mot planet
  2. newPos = intersect - offset
  3. updateDevice(id, { position: [newPos.x, device.y, newPos.z] })

onUp:
  1. Ta bort lyssnare
  2. Aterstall cursor
```

### Implementationsordning

1. Rensa `DeviceMarkers3D.tsx`: ta bort TransformControls, SelectedDeviceWithGizmo, modul-globaler. Gor marker-komponenterna draggbara med pointer-events nar `selected && buildMode`
2. Rensa `BuildInspector.tsx`: ta bort Gizmo-lage-sektionen, lagg till Y-rotation slider
3. Verifiera att 2D-lagets enhetsinteraktion fungerar
