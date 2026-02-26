

# Analys: Saknade HA-domäner och enhetstyper

## Nuvarande stöd (12 domäner)
light, switch, input_boolean, sensor, binary_sensor, climate, camera, vacuum, lock, media_player, fan, cover, scene, script, automation

## Saknade domäner (rangordnade efter relevans för smart home)

### Prioritet 1 -- Mycket vanliga i svenska hem
| Domän | Beskrivning | Förslag DeviceKind | UI-kontroll |
|-------|-------------|-------------------|-------------|
| **alarm_control_panel** | Larmsystem (Verisure, Sector etc.) | `alarm` | Arm/Disarm/Home-knappar, PIN-inmatning, statusindikator |
| **water_heater** | Varmvattenberedare | `water-heater` | Temperatur-slider, on/off, driftläge |
| **humidifier** | Luftfuktare/avfuktare | `humidifier` | Målnivå-slider, on/off, fläktläge |
| **device_tracker** | Personspårning (telefon, GPS) | *(ej enhet i 3D)* | Hemma/borta-status i dashboard |
| **button** | Engångstryckare (t.ex. restart, trigger) | *(mappas till `switch`)* | Enkel tryckknapp |
| **siren** | Siren/larm | `siren` | On/off, volym, ton-val |

### Prioritet 2 -- Bra att ha
| Domän | Beskrivning | Förslag DeviceKind | UI-kontroll |
|-------|-------------|-------------------|-------------|
| **valve** | Vattenavstängningsventil | `valve` | Öppna/stäng, position |
| **remote** | IR/RF-fjärrkontroll | `remote` | Kommandoknappar |
| **lawn_mower** | Robotgräsklippare | `lawn-mower` | Start/dock/pause (som vacuum) |
| **number** / **input_number** | Numeriskt hjälpvärde | *(mappas till `sensor`)* | Slider |
| **select** / **input_select** | Dropdown-val | *(mappas till `switch`)* | Dropdown |
| **weather** | Väderstation-entitet | *(redan i environment)* | Koppling till väder-widget |
| **update** | Firmware-uppdateringar | *(ej 3D-enhet)* | Uppdateringsstatus i profil/aktivitet |

### Prioritet 3 -- Nischade
calendar, todo, notify, text, date, datetime, time, event, image, image_processing, conversation, stt, tts, wake_word, ai_task, assist_satellite, geo_location, air_quality, tag

---

## Implementationsplan (Prioritet 1)

### Filändringar

| Fil | Ändring |
|-----|---------|
| `src/store/types.ts` | Nya `DeviceKind`: `alarm`, `water-heater`, `humidifier`, `siren`. Nya state-interfaces: `AlarmState`, `WaterHeaterState`, `HumidifierState`, `SirenState`. Utöka `DeviceState`-union. Nya `BuildTool`-varianter. |
| `src/lib/haDomainMapping.ts` | Mappa `alarm_control_panel` → `alarm`, `water_heater` → `water-heater`, `humidifier` → `humidifier`, `siren` → `siren`, `button` → `switch`, `number`/`input_number` → `sensor`, `select`/`input_select` → `switch`, `valve` → `valve`, `remote` → `remote`, `lawn_mower` → `lawn-mower` |
| `src/lib/haMapping.ts` | Nya case-block: `alarm_control_panel` (armed_away/armed_home/disarmed/triggered), `water_heater` (temp+mode), `humidifier` (humidity+mode), `siren` (on/off+tone), `button` (generic), `number`/`input_number` (value+min/max), `select`/`input_select` (options+selected), `valve` (position), `remote` (on/off), `lawn_mower` (status som vacuum-variant) |
| `src/hooks/useHABridge.ts` | Nya service-calls: `alarm_control_panel.alarm_arm_away/home/disarm`, `humidifier.set_humidity/set_mode`, `water_heater.set_temperature`, `siren.turn_on/off`, `button.press`, `number.set_value`, `input_number.set_value`, `select.select_option`, `valve.open/close`, `lawn_mower.start/dock/pause` |
| `src/components/build/devices/DevicePlacementTools.tsx` | Nya verktyg i deviceTools-listan med ikoner: `ShieldAlert` (alarm), `Droplets` (humidifier), `Flame` (water-heater), `Bell` (siren), `Grip` (valve), `Wifi` (remote), `Trees` (lawn-mower) |
| `src/components/home/cards/DeviceControlCard.tsx` | Nya kontrollkomponenter: `AlarmControl` (arm/disarm-knappar med PIN), `HumidifierControl` (fuktighets-slider), `WaterHeaterControl` (temp-slider), `SirenControl` (on/off + ton), `ValveControl` (öppna/stäng), `LawnMowerControl` (start/dock/pause) |
| `src/components/devices/DeviceMarkers3D.tsx` | Nya 3D-markörer för de nya enhetstyperna (enkla geometrier med statusfärg) |

### Nya state-interfaces (types.ts)

```text
AlarmState { state: 'disarmed'|'armed_home'|'armed_away'|'armed_night'|'pending'|'triggered', code?: string }
WaterHeaterState { on: boolean, temperature: number, mode: 'eco'|'electric'|'performance'|'off' }
HumidifierState { on: boolean, humidity: number, mode?: string, availableModes?: string[] }
SirenState { on: boolean, tone?: string, volume?: number, availableTones?: string[] }
```

### device_tracker -- Special hantering
Inte en 3D-placerad enhet, men synkas till dashboard. Visa "Hemma/Borta"-status per person i en ny sektion i Home-vyn eller som badge.

