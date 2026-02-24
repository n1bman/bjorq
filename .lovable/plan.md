

# Riktig Home Assistant WebSocket-integration

## Problem
Anslutningen till Home Assistant ar helt simulerad idag -- den satter bara statusen till "connected" utan att oppna nagon faktisk WebSocket-forbindelse. Inga entiteter hamtas och inga tillstandsandringar synkas.

## Losning

### 1. Ny WebSocket-hook (`src/hooks/useHomeAssistant.ts`)

Skapar en hook som hanterar hela HA-kommunikationen:

- **Anslutning**: Oppnar en WebSocket till den angivna URL:en
- **Autentisering**: Skickar `{"type": "auth", "access_token": "..."}` vid anslutning
- **Hamta entiteter**: Skickar `{"type": "get_states", "id": 1}` efter autentisering
- **Prenumerera pa andringar**: Skickar `{"type": "subscribe_events", "event_type": "state_changed", "id": 2}` for realtidsuppdateringar
- **Mappning**: Konverterar HA-entiteter till appens `HAEntity`-format och uppdaterar `liveStates`
- **Felhantering**: Satter status till `error` vid anslutningsfel, forsoker ateransluta
- **Synk till enheter**: Nar en `state_changed`-haendelse kommer in, och det finns en `DeviceMarker` med matchande `ha.entityId`, uppdateras enhetens `deviceState` automatiskt

### HA WebSocket-protokoll (forenklat)

```text
1. Client oppnar WebSocket till ws://ha:8123/api/websocket
2. Server skickar: {"type": "auth_required"}
3. Client skickar: {"type": "auth", "access_token": "TOKEN"}
4. Server skickar: {"type": "auth_ok"} eller {"type": "auth_invalid"}
5. Client skickar: {"type": "get_states", "id": 1}
6. Server svarar med alla entiteter
7. Client skickar: {"type": "subscribe_events", "event_type": "state_changed", "id": 2}
8. Server skickar "state_changed"-events i realtid
```

### 2. Uppdatera HAConnectionPanel (`src/components/home/cards/HAConnectionPanel.tsx`)

- Ta bort simulerad `setTimeout`-logik
- Anropa den nya hooken for att starta/stoppa anslutningen
- Visa anslutningsstatus, antal entiteter och senaste uppdatering
- Visa felmeddelande om autentisering misslyckas

### 3. Uppdatera store (`src/store/useAppStore.ts`)

- Lagg till actions for att uppdatera `homeAssistant.entities` och `homeAssistant.liveStates` fran WebSocket-data
- Lagg till `setHAEntities` och `updateHALiveState` actions
- Automatisk mappning: nar `liveStates` uppdateras for en entitet som ar kopplad till en `DeviceMarker`, uppdatera aven `deviceStates`

### 4. Mappningsfunktion HA-entitet till DeviceState

Konverterar HA-attribut till appens format:
- `light.*`: `on`, `brightness` (0-255), `color_temp`, `rgb_color`
- `switch.*`: `on/off`
- `climate.*`: `mode`, `temperature`, `current_temperature`
- `sensor.*`: `state` (numeriskt varde), `unit_of_measurement`
- `camera.*`: `on/off`, `entity_picture`
- `lock.*`: `locked/unlocked`
- `vacuum.*`: `status`, `battery_level`
- `media_player.*`: `state`, `media_title`, `media_artist`, `volume_level`

### 5. Skicka kommandon tillbaka till HA

Nar anvandaren andrar en enhet i appen (t.ex. slacker av en lampa), skicka service-anrop till HA:
- `{"type": "call_service", "domain": "light", "service": "turn_on", "service_data": {"entity_id": "light.xxx", "brightness": 200}, "id": N}`

---

## Filandringar

| Fil | Andring |
|-----|---------|
| `src/hooks/useHomeAssistant.ts` | **NY** -- WebSocket-klient med auth, entitetshantning och realtidsprenumeration |
| `src/components/home/cards/HAConnectionPanel.tsx` | Ersatt simulering med riktig anslutningslogik |
| `src/store/useAppStore.ts` | Nya actions: `setHAEntities`, `updateHALiveState`, `callHAService` |
| `src/store/types.ts` | Lagg till `callHAService` action-typ, `wsRef` for att halla WebSocket-referens |
