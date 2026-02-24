

# Tvavagssynk mellan appen och Home Assistant

## Problem

Synkroniseringen ar enkelriktad -- nar Home Assistant skickar en state_changed-handelse uppdateras appens lokala tillstand korrekt, men nar anvandaren andrar en enhet i appen (t.ex. slacker en lampa, andrar ljusstyrka) skickas inget kommando tillbaka till HA. Darfor "hander inget" nar man trycker pa/av i appen.

## Losning

### 1. Skapa en HA service-anropsfunktion som kopplas till store-actions

Problemet ar att `useHomeAssistant`-hooken har `callService`, men den anvands aldrig. Vi behover koppla den sa att varje gang `updateDeviceState` eller `toggleDeviceState` kallas for en HA-kopplad enhet, skickas ett motsvarande service-anrop.

### 2. Ny bridge-hook: `useHABridge`

Skapar en hook som lyssnar pa forandringar i `deviceStates` och skickar motsvarande HA-kommandon:

- Placeras i `HomeView` och `BuildModeV2` (dar enheter kan styras)
- Nar `updateDeviceState(id, { on: true, brightness: 200 })` kallas for en enhet kopplad till `light.spot_2`:
  - Skickar `call_service` med domain=`light`, service=`turn_on`, service_data=`{ entity_id: "light.spot_2", brightness: 200 }`
- Nar `toggleDeviceState(id)` kallas:
  - Skickar `call_service` med `turn_on` eller `turn_off`

### 3. Mappning: DeviceState-andringar till HA service-anrop

```text
light:
  on=true  -> light/turn_on  { entity_id, brightness, color_temp, rgb_color }
  on=false -> light/turn_off  { entity_id }

switch / input_boolean / power-outlet:
  on=true  -> switch/turn_on eller input_boolean/turn_on
  on=false -> switch/turn_off eller input_boolean/turn_off

climate:
  mode     -> climate/set_hvac_mode { entity_id, hvac_mode }
  targetTemp -> climate/set_temperature { entity_id, temperature }

lock:
  locked=true  -> lock/lock
  locked=false -> lock/unlock

vacuum:
  status=cleaning -> vacuum/start
  status=docked   -> vacuum/stop eller vacuum/return_to_base

media_player:
  on=false -> media_player/turn_off
  state=playing -> media_player/media_play
  state=paused  -> media_player/media_pause
  volume   -> media_player/volume_set { volume_level }

camera:
  on=true/false -> (inget standard-service, beror pa integration)
```

### 4. Forhindra feedback-loop

Nar HA skickar tillbaka en state_changed som svar pa vart eget kommando, maste vi undvika att det triggar en ny uppdatering som overskrider det anvandaren just gjort. Losning:

- Satt en kort "suppress"-flagga (500ms) efter varje outgaende kommando for den entiteten
- Under suppress-perioden ignoreras inkommande state_changed for den entiteten (eftersom det ar var egen eko)

### 5. Initial sync vid koppling

Nar en enhet kopplas till en HA-entitet (i BuildInspector via HAEntityPicker), hamta direkt det senaste tillstandet fran `homeAssistant.liveStates` och uppdatera `deviceStates` sa att enheten far ratt initialvarden (t.ex. att SPOT 2 ar pa med brightness 180).

---

## Filandringar

| Fil | Andring |
|-----|---------|
| `src/hooks/useHABridge.ts` | **NY** -- Bridge-hook som lyssnar pa deviceState-andringar och skickar HA service-anrop, plus suppress-logik |
| `src/hooks/useHomeAssistant.ts` | Exportera `callService` globalt (via ref eller store) sa att bridge-hooken kan anropa den utan att vara i samma komponent |
| `src/store/useAppStore.ts` | I `updateDeviceState` och `toggleDeviceState`: anropa bridge-funktionen for att skicka HA-kommando. I `updateDevice` (nar `ha.entityId` andras): synka initial state fran `liveStates` |
| `src/components/home/HomeView.tsx` | Montera `useHABridge` |
| `src/components/build/BuildModeV2.tsx` | Montera `useHABridge` |

### Tillvagagangssatt

1. Skapa en global `haServiceCaller`-ref i `useHomeAssistant.ts` som exponerar `callService`
2. Skapa `useHABridge.ts` som prenumererar pa store-andringar via `useAppStore.subscribe` och skickar kommandon
3. Uppdatera `updateDevice` i storen sa att nar `ha.entityId` satts, synkas initial state fran `liveStates`
4. Montera bridge-hooken i ratt komponenter
