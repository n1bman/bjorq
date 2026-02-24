

# Maximera HA-synk: Nya domaner, vaderintegration och framtidsakring

## Oversikt

Efter genomgang av hela synkkedjan (`haMapping.ts` -> `haDomainMapping.ts` -> `useHABridge.ts` -> `types.ts` -> `DeviceControlCard.tsx`) finns det flera luckor och mojligheter att forbattra integrationen avsevart.

## 1. Nya enhetstyper

### Fan (flakt) -- idag bara on/off, borde ha hastighet
- Ny `FanState` med `on`, `speed` (0-100%), `preset` (low/medium/high)
- Ny DeviceKind `'fan'` och BuildTool `'place-fan'`
- Mapping fran HA: `fan` -> `percentage`, `preset_mode`
- Bridge: `fan.set_percentage`, `fan.turn_on/off`
- UI-kontroll med hastighetsslider

### Cover (persienner/jalusier/garageportar) -- saknas helt
- Ny `CoverState` med `position` (0-100), `state` (open/closed/opening/closing)
- Ny DeviceKind `'cover'`
- Mapping fran HA: `cover` -> `current_position`
- Bridge: `cover.open_cover`, `cover.close_cover`, `cover.set_cover_position`
- UI-kontroll med positionsslider
- Koppla `garage-door` (som redan finns som kind) till `cover`-domanen nar `device_class === 'garage'`

### Scene / Script / Automation -- knappar att trigga
- Ny DeviceKind `'scene'` (enkel trigger-knapp)
- Mapping: `scene`, `script`, `automation` -> trigger-bara enheter
- Bridge: `scene.turn_on`, `script.turn_on`, `automation.trigger`
- Kompakt UI: enbart en "Kor"-knapp

## 2. Vader fran HA (`weather.*` entiteter)

Home Assistants `weather.*`-entiteter innehaller rikare data an Open-Meteo:
- `temperature`, `humidity`, `wind_speed`, `condition`
- `forecast` (attribut med timvis/daglig prognos)

### Plan
- Lagg till `'ha'` som mojlig `environment.source` (redan finns i typen!)
- Nar `source === 'ha'`: hitta forsta `weather.*`-entiteten i `liveStates`
- Mappa `weather.*` condition -> var `WeatherCondition`
- Mappa forecast-attributet -> var `ForecastDay[]`
- Uppdatera `useWeatherSync` att prenumerera pa HA-vader nar `source === 'ha'`
- Lagg till val i LocationSettings for att valja HA-vader som kalla

## 3. Energidata fran HA-sensorer

Manga HA-installationer har `sensor.*_power` och `sensor.*_energy`. Dessa kan kopplas till `EnergyTracking` pa enhetsmarkorer:
- Nar en enhet har en kopplad HA-entitet, sok automatiskt efter relaterade energi-sensorer (via `device_id` i attribut eller namnmonster)
- Alternativt: lat anvandaren manuellt valja en energi-sensor per enhet i inspektorn
- Synka `currentWatts` live fran HA-sensorvarde

## 4. Forbattrad befintlig synk

### Binary sensors: korrekt mappning
- `binary_sensor` med `device_class: motion` -> `value: 1/0` baserat pa `on/off` (inte `parseFloat`)
- `binary_sensor` med `device_class: door/window` -> ny `'contact'` sensorType
- Uppdatera `lastMotion` tidstampel automatiskt nar rorelse detekteras

### Number / Select / Input entities
- `number.*` och `input_number.*` -> sensor med redigerbart varde
- `select.*` och `input_select.*` -> dropdown-kontroll
- Bridge: `number.set_value`, `input_select.select_option`

## Filandringar

| Fil | Andring |
|-----|---------|
| `src/store/types.ts` | Nya typer: `FanState`, `CoverState`, `SceneState`. Nya DeviceKind: `fan`, `cover`, `scene`. Utoka `DeviceState` union. Nya `BuildTool` varianter. |
| `src/lib/haMapping.ts` | Nya case: `fan`, `cover`, `scene`, `script`, `automation`, `weather`. Fix `binary_sensor` mappning for motion/door. |
| `src/lib/haDomainMapping.ts` | Lagg till `fan`, `cover`, `scene`/`script`/`automation` i bade `kindToDomains` och `domainToKind`. Koppla `garage-door` till `cover`. |
| `src/hooks/useHABridge.ts` | Nya case i `sendHACommand`: `fan` (hastighet), `cover` (position), `scene`/`script`/`automation` (trigger). |
| `src/hooks/useWeatherSync.ts` | Ny gren: om `source === 'ha'`, hamta vader fran `liveStates['weather.*']` istallet for Open-Meteo. |
| `src/store/useAppStore.ts` | Nya defaultStates for `fan`, `cover`, `scene`. |
| `src/components/home/cards/DeviceControlCard.tsx` | Nya kontrollkomponenter: `FanControl`, `CoverControl`, `SceneControl`. |
| `src/components/build/devices/DevicePlacementTools.tsx` | Nya knappar for fan, cover, scene. |
| `src/components/home/cards/LocationSettings.tsx` | Nytt val for "Anvand HA-vader" nar HA ar anslutet. |

## Prioritetsordning

1. **Fan + Cover** -- vanligaste saknade typerna
2. **Weather fran HA** -- direkt nytta for vader-widgeten
3. **Binary sensor fix** -- korrekta rorelse/dorrvardem
4. **Scene/Script/Automation** -- bekvamlighet
5. **Energikoppling** -- avancerat men vardefullt

