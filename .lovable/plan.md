
# Enheter: Gizmo, auto-deselect, fler enhetstyper och toolbar-fix

## Problem att losa

1. **Ingen pivot/gizmo** -- efter placering kan man inte flytta/rotera enheter visuellt i 3D. Behovs en translate/rotate gizmo (TransformControls fran drei).
2. **Sol & Vader hamnar i toolbarn** -- miljopanelen renderas som `absolute` inuti toolbar-diven som har `overflow-x-auto`, sa den hamnar i scrollfloden istallet for att flyta ovanfor.
3. **Place-verktyget stannar aktivt** -- efter att man placerat en enhet forblir place-verktyget aktivt sa man kan trycka ut massa enheter. Ska aterstallas till `select` efter en placering.
4. **For fa enhetstyper** -- saknas kamera, robotdammsugare, kylskap, av/pa-knapp, varmeskap, tvattmaskin, garageport, dorr m.fl.

## Andringar

### 1. TransformControls-gizmo for valda enheter

I `DeviceMarkers3D.tsx`, nar `buildMode` ar aktivt och en enhet ar vald:
- Wrappa den valda markoren med `<TransformControls>` fran `@react-three/drei`
- Lagg till en liten UI-kontroll (knappar) i inspektorn for att valja mode: "translate" eller "rotate"
- Nar gizmo drags, uppdatera `updateDevice` med nya position/rotation-varden via `onObjectChange`-event
- Inaktivera OrbitControls nar gizmo ar aktiv (TransformControls gor detta automatiskt via `makeDefault` pa OrbitControls)

### 2. Auto-deselect efter placering

I `BuildScene3D.tsx` `handleGroundPointerDown` och i `BuildCanvas2D.tsx`:
- Efter `addDevice(...)`, lagg till `setBuildTool('select')` sa verktyget atergar till markera-lage efter en placering
- Om anvandaren vill placera fler far den trycka pa enhetstypen igen

### 3. Fixa Sol & Vader-panelen

I `BuildTopToolbar.tsx`:
- Flytta miljopanelen ut fran toolbar-diven, eller andra den till `fixed`/portal-baserad positionering sa den inte paskverkas av `overflow-x-auto`
- Enklast: andra panelens CSS fran `absolute top-full right-3` till att anvanda en overlay/portal utanfor scrollcontainern

### 4. Fler enhetstyper

Utoka `DeviceKind` i `types.ts`:
```
export type DeviceKind =
  | 'light' | 'switch' | 'sensor' | 'climate'
  | 'vacuum' | 'camera' | 'fridge' | 'oven'
  | 'washer' | 'garage-door' | 'door-lock'
  | 'power-outlet';
```

Utoka `BuildTool` med:
```
  | 'place-vacuum' | 'place-camera' | 'place-fridge'
  | 'place-oven' | 'place-washer' | 'place-garage-door'
  | 'place-door-lock' | 'place-power-outlet'
```

Uppdatera `DevicePlacementTools.tsx`:
- Lagg till knappar for alla nya typer med passande ikoner (Camera, Bot, Refrigerator, CookingPot, WashingMachine, DoorOpen, Lock, Plug)

Uppdatera `DeviceMarkers3D.tsx`:
- Lagg till enkla visuella markoerer for varje ny typ (fargade sfarer/ringar med unika farger)
- Kamera: rod glow
- Robotdammsugare: lila pulsering (redan finns vacuum -> SensorMarker)
- Kylskap/ugn/tvattmaskin: vita/gra sfarer med unik emissive farg
- Garageport/dorr: orange ringar
- Eluttag: gul ring

Uppdatera `BuildInspector.tsx` (DeviceInspector):
- Utoka `kindLabels` med alla nya typer

Uppdatera `BuildScene3D.tsx`:
- Hantera alla nya `place-*`-verktyg i `handleGroundPointerDown` med lampande default-hojder

## Tekniska detaljer

### TransformControls-integration
```tsx
import { TransformControls } from '@react-three/drei';

// I DeviceMarkers3D, for den valda markoren:
{selected && buildMode && (
  <TransformControls
    mode={transformMode} // 'translate' | 'rotate'
    onObjectChange={(e) => {
      const obj = e.target.object;
      updateDevice(marker.id, {
        position: [obj.position.x, obj.position.y, obj.position.z],
        rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      });
    }}
  >
    <Component ... />
  </TransformControls>
)}
```

### DeviceInspector andringar
- Lagg till "Flytta/Rotera"-knappar som styr `transformMode` state (laggs i store eller lokalt i DeviceMarkers3D via ett callback)
- Lagg till position X/Z sliders (som PropInspector har) for fininjustering via UI

### BuildTopToolbar fix
- Wrappa hela komponenten i en relativ container, och rendera miljopanelen som ett separat lager med `fixed` eller `z-[200]` utanfor overflow-containern

### Implementationsordning
1. Utoka `DeviceKind` och `BuildTool` i `types.ts` med alla nya enhetstyper
2. Uppdatera `DevicePlacementTools.tsx` med nya verktygsknappar
3. Uppdatera `DeviceMarkers3D.tsx` med nya marker-komponenter + TransformControls-gizmo
4. Uppdatera `BuildScene3D.tsx` -- auto-deselect efter placering + hantera nya place-verktyg
5. Uppdatera `BuildCanvas2D.tsx` -- auto-deselect efter placering
6. Uppdatera `BuildInspector.tsx` -- nya kindLabels + position X/Z sliders + flytta/rotera-knappar
7. Fixa `BuildTopToolbar.tsx` -- flytta miljopanelen ut ur overflow-containern
