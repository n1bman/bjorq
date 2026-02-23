

# Interaktiv kontrollpanel + HA-prepp

## Oversikt

Kontrollpanelen byggs om fran statiska on/off-switchar till enhetstypspecifika kontrollkort med rika reglage. Samtidigt preppas hela datalagret for HA-integration genom att utoka `deviceStates` fran en enkel `boolean` till ett rikt state-objekt per enhetstyp.

## 1. Utoka device state-modellen

**Fil: `src/store/types.ts`**

Ersatt `deviceStates: Record<string, boolean>` med ett typat state-system:

```typescript
// Rikt device state per enhetstyp
export interface LightState {
  on: boolean;
  brightness: number;       // 0-255
  colorTemp?: number;       // mireds
  rgbColor?: [number, number, number];
  colorMode: 'temp' | 'rgb' | 'off';
}

export interface ClimateState {
  on: boolean;
  mode: 'heat' | 'cool' | 'auto' | 'off';
  targetTemp: number;
  currentTemp: number;
}

export interface MediaState {
  on: boolean;
  state: 'playing' | 'paused' | 'idle' | 'off';
  title?: string;
  artist?: string;
  source?: string;
  volume: number;           // 0-1
  progress?: number;        // 0-1
}

export interface VacuumState {
  on: boolean;
  status: 'cleaning' | 'docked' | 'returning' | 'error';
  battery: number;          // 0-100
}

export interface LockState {
  locked: boolean;
}

export interface SensorState {
  value: number;
  unit: string;
}

export interface GenericDeviceState {
  on: boolean;
}

export type DeviceState = 
  | { kind: 'light'; data: LightState }
  | { kind: 'climate'; data: ClimateState }
  | { kind: 'media_screen'; data: MediaState }
  | { kind: 'vacuum'; data: VacuumState }
  | { kind: 'door-lock'; data: LockState }
  | { kind: 'sensor'; data: SensorState }
  | { kind: 'generic'; data: GenericDeviceState };
```

Uppdatera `DevicesState`:
```typescript
export interface DevicesState {
  markers: DeviceMarker[];
  deviceStates: Record<string, DeviceState>;
}
```

## 2. Nya store-actions

**Fil: `src/store/useAppStore.ts`**

Lagg till actions for att manipulera de rikare states:

- `setDeviceState(id, state)` -- ersatter den gamla boolean-versionen
- `updateDeviceState(id, partialData)` -- partial update av data
- `getDefaultState(kind): DeviceState` -- returnerar default state for varje enhetstyp

Nar en enhet placeras, skapa automatiskt en default state i `deviceStates`.

## 3. Enhetstypspecifika kontrollkort

**Ny fil: `src/components/home/cards/DeviceControlCard.tsx`**

En komponent som renderar ratt kontrollgranssnitt baserat pa enhetstyp:

### Ljus (light)
- On/off switch
- Ljusstyrka-slider (0-100%)
- Fargtemperatur-slider (varm till kall)
- RGB-fargvaljare (enkel gradient-bar)
- Lage-knappar: Temp | RGB | Av

### Klimat (climate)
- On/off switch
- Lage-valjare: Varme | Kyla | Auto | Av
- Mal-temperatur med +/- knappar och stor siffra
- Aktuell temperatur (gra, mindre)

### Skarmar (media_screen)
- On/off switch
- Play/Pause/Stop knappar
- Volym-slider
- Titel + Artist visning
- Kalla-valjare (Netflix, Spotify, etc)
- Progress bar

### Dammsugare (vacuum)
- Start/Stop/Dock knappar
- Status-text (Stader, Dockad, etc)
- Batteri-indikator

### Dorr-las (door-lock)
- Stor las/lasa upp knapp med animation
- Status-ikon (last/olast)

### Sensor
- Stort varde med enhet
- Inga reglage (read-only)

### Generiska (switch, power-outlet, garage-door, etc)
- On/off switch
- Status-text

## 4. Ny DevicesSection med expanderbara kort

**Fil: `src/components/home/cards/DevicesSection.tsx`**

Bygg om fran platta rader till interaktiva kort:

- Klick pa kort expanderar det och visar DeviceControlCard
- Gruppering per rum (inte bara vaning)
- Snabb-atgard synlig aven i komprimerat lage (t.ex. ljusstyrka-slider for lampor)
- HA-koppling visas som liten badge

## 5. Enheter-kategorin i DashboardGrid

**Fil: `src/components/home/DashboardGrid.tsx`**

Uppgradera `DevicesCategory` med:

- Filter-knappar per enhetstyp (Lampor, Klimat, Media, etc)
- Sokfalt for enheter
- "Alla enheter" och "Per rum" vy-vaxling

## 6. HA-prepp i typer och store

All data som HA skickar mappas till vart `DeviceState`-format. Nar HA-integrationen byggs ut later behover man bara:

1. Lyssna pa WebSocket-meddelanden
2. Mappa `attributes` till ratt `DeviceState`
3. Anropa `updateDeviceState()` 
4. For kommandon: skicka `call_service` via WebSocket

Ingen HA-WebSocket-kod skrivs nu -- bara datastrukturen preppas.

## Teknisk sammanfattning

| Fil | Andring |
|-----|---------|
| `src/store/types.ts` | Nya DeviceState-typer, uppdaterad DevicesState |
| `src/store/useAppStore.ts` | Nya actions, getDefaultState, migration till v13 |
| `src/components/home/cards/DeviceControlCard.tsx` | **NY** -- Enhetstypspecifika kontroller |
| `src/components/home/cards/DevicesSection.tsx` | Ombyggd med expanderbara kort |
| `src/components/home/DashboardGrid.tsx` | Filter och forbattrad Enheter-kategori |
| `src/components/devices/DeviceMarkers3D.tsx` | Lasa MediaState fran nya deviceStates for skarm-rendering |

## Migrering

Store version bumpas till 13. Befintliga `boolean`-states migreras automatiskt till det nya formatet via `getDefaultState()`.
