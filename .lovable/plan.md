

# Robotdammsugare: Rumsbaserad rorelssimulering V1

## Oversikt

Istallet for att forlita sig pa exakta XY-koordinater fran Valetudo implementeras en rumsbaserad rorelsesimulering. Roboten "vandrar" realistiskt inuti det rum som HA-sensorn (`sensor.s5_max_nuvarande_rum`) rapporterar, med mjuka overganger mellan rum. Systemet designas sa att det enkelt kan uppgraderas till exakt XY-positionering i framtiden.

---

## 1. Nya typer (types.ts)

### VacuumState -- nya falt

| Falt | Typ | Beskrivning |
|------|-----|-------------|
| `currentRoom` | `string` | Rumsnamn fran HA-sensor (t.ex. "Kok") |

### Ny typ: VacuumZone

```text
interface VacuumZone {
  roomId: string;
  polygon: [number, number][];  // x,z-koordinater i meter
}
```

### Ny typ: VacuumMapping (lagras per floor)

```text
interface VacuumMapping {
  dockPosition: [number, number] | null;  // x,z i meter
  zones: VacuumZone[];                     // rorelsezoner per rum
}
```

### BuildTool -- nytt verktyg

Lagg till `'place-vacuum-dock'` och `'vacuum-zone'` i `BuildTool`-unionen.

### AppState -- nya actions

- `setVacuumMapping(floorId, mapping)` -- spara dock + zoner
- `setVacuumDock(floorId, pos)` -- satt dockposition
- `addVacuumZone(floorId, zone)` -- lagg till zon
- `removeVacuumZone(floorId, roomId)` -- ta bort zon

### Floor -- utokat

Lagg till `vacuumMapping?: VacuumMapping` pa `Floor`-interfacet.

---

## 2. HA-mappning (haMapping.ts)

I vacuum-case:n, lagg till:

- `currentRoom`: hamtas INTE fran vacuum-entiteten, utan fran en separat sensor. Hanteras i bridge:en (se nedan).

---

## 3. HA-bridge: Rumssynk (useHABridge.ts)

Ny logik for att lyssna pa `sensor.s5_max_nuvarande_rum`:

- Nar sensorn andras -> uppdatera vacuum-enhetens `currentRoom` i deviceState
- Mappningen sker via enhetsnamn: matcha sensorns state-string mot rum-namn i layouten
- Hitta matchande `VacuumZone` for det rummet
- Uppdatera `vacuumState.currentRoom`

---

## 4. Rorelsemotor i 3D (DeviceMarkers3D.tsx)

### Ny wandering-algoritm i VacuumMarker3D

Ersatt den enkla `position`-lerp med en komplett rorelsemotor:

```text
Tillstand:
  - currentTarget: [x, z] -- aktuellt mal inuti polygon
  - speed: 0.2 m/s
  - smoothRotation: robotens riktning interpoleras mjukt

Logik (useFrame):
  1. Om status === 'cleaning':
     a. Hamta aktiv zon fran currentRoom -> VacuumZone.polygon
     b. Om inget currentTarget eller nara nog -> valj ny random punkt inuti polygonen
     c. Flytta roboten mot target med speed * delta
     d. Rotera roboten mjukt mot rorelsriktningen
     e. Vid rumsbyte: interpolera mot ny zon over ~2 sekunder

  2. Om status === 'returning' eller 'docked':
     a. Flytta mot dockPosition (fran VacuumMapping)
     b. Nar framme: stanna

  3. Om status === 'paused':
     a. Stanna pa plats, LED pulserar langsamt

Random-punkt-i-polygon:
  - Anvand bounding-box + rejection sampling
  - Fungerar med pointInPolygon-test (finns redan i BuildCanvas2D)
```

### Framtidssaker (`setRobotPosition`)

Om `vacuumState.position` har ett varde (fran Valetudo) -- anvand det direkt istallet for wandering. Sa uppgradering blir automatisk.

---

## 5. Byggverktyg: Robot Mapping (BuildCanvas2D + ny panel)

### Ny panel: VacuumMappingTools

Visas under Enheter-fliken i bygglageet nar en vacuum finns. Innehaller:

- **Placera docka** -- klicka pa kartan for att satta dockPosition
- **Rita zon** -- polygoneredigerare (liknar vaggritning) for att definiera rorelsezoner per rum
- **Zonlista** -- visa/ta bort zoner, kopplade till rum

### I BuildCanvas2D

Nytt ritlager for vacuum-zoner:

- Rita ifyllda halvtransparenta polygoner i bla/gront
- Dockmarkorn ritas som en liten ikon (typ hemikon)
- Nar `vacuum-zone`-verktyget ar aktivt: klicka for att lagga till polygonnoder (som vaggritning), dubbelklicka for att stanga polygon

---

## 6. RobotPanel -- uppdatering

Uppdatera RobotPanel med:

- Visa aktuellt rum: `"Stadar i: Koket"`
- Kartvyn: istallet for placeholder, visa en enkel 2D-planvy med rummen och robotens position som en animerad prick

---

## Filandringar

| Fil | Andring |
|-----|---------|
| `src/store/types.ts` | Nya typer: `VacuumZone`, `VacuumMapping`. Nya falt pa `Floor` och `VacuumState`. Nya `BuildTool`-varianter. Nya store-actions. |
| `src/store/useAppStore.ts` | Implementera `setVacuumMapping`, `setVacuumDock`, `addVacuumZone`, `removeVacuumZone`. |
| `src/lib/haMapping.ts` | Lagg till `currentRoom`-stod i vacuum-mappningen. |
| `src/hooks/useHABridge.ts` | Lyssna pa rumssensor och uppdatera vacuum `currentRoom`. |
| `src/components/devices/DeviceMarkers3D.tsx` | Ny wandering-algoritm i `VacuumMarker3D`: rumsbaserad rorelse med mjuk interpolering, rotationsanimation, zon-medvetenhet. Fallback till `position` om tillgangligt (Valetudo-redo). |
| `src/components/build/devices/VacuumMappingTools.tsx` | **Ny fil** -- Panel for att placera docka och rita rorelsezoner i bygglageet. |
| `src/components/build/BuildCanvas2D.tsx` | Nytt ritlager for vacuum-zoner och dockmarkorer. Stod for `vacuum-zone`-verktyget. |
| `src/components/home/cards/RobotPanel.tsx` | Visa aktuellt rum. Ersatt kart-placeholder med enkel 2D mini-karta. |

