

# Fix: WebSocket-anslutningen maste vara en singleton

## Rotorsak

`useHomeAssistant()` anvander lokala React refs (`wsRef`) for WebSocket-anslutningen. Varje komponent som anropar hooken far sin **egen separata instans** med sin egen `wsRef`. Det som hander:

1. **HAConnectionPanel** anropar `useHomeAssistant()` -- ansluter -- `wsRef` ar giltig -- satter `haServiceCaller.current`
2. **HomeView** anropar ocksa `useHomeAssistant()` -- ser att status redan ar `'connected'` -- hoppar over auto-connect -- dess `wsRef` forblir `null` -- **overskriver** `haServiceCaller.current` med sin egen trasiga `callService`
3. Bridgen anropar `haServiceCaller.current` -- anvander HomeViews `callService` -- `wsRef` ar null -- "Cannot call service: not connected"

## Losning: Modul-niva singleton

Flytta all WebSocket-hantering (anslutning, `wsRef`, `callService`) till **modul-niva** istallet for inuti React-hooken. Da delar alla komponenter samma anslutning.

### Andringar i `src/hooks/useHomeAssistant.ts`

Refaktorera sa att:

- `wsRef`, `reconnectTimer`, `manualDisconnect` och `msgId` ar **modul-niva variabler** (utanfor hooken)
- `connect()`, `disconnect()`, `callService()` ar **vanliga funktioner** pa modul-niva som anvander dessa delade variabler
- `haServiceCaller.current` satts direkt i `connect()` nar anslutningen lyckas, istallet for via en React effect
- Hooken (`useHomeAssistant()`) returnerar bara `{ connect, disconnect, callService }` och gor auto-reconnect vid mount
- Cleanup-effecten stanger **inte** WebSocketen (den ar delad) -- bara vid manuell disconnect

### Andringar i `src/hooks/useHABridge.ts`

Inga andringar -- bridgen anvander redan `haServiceCaller.current` korrekt.

### Andringar i `src/components/home/HomeView.tsx` och `src/components/build/BuildModeV2.tsx`

Inga andringar -- de monterar redan `useHomeAssistant()` och `useHABridge()`.

### Andringar i `src/components/home/cards/HAConnectionPanel.tsx`

Inga andringar -- den anvander redan `useHomeAssistant()`.

---

## Teknisk sammanfattning

```text
FORE:
  HAConnectionPanel -> useHomeAssistant() -> wsRef_A (ansluten)
  HomeView          -> useHomeAssistant() -> wsRef_B (null!) -> overskriver haServiceCaller

EFTER:
  modul-niva        -> wsRef (delad singleton)
  HAConnectionPanel -> useHomeAssistant() -> returnerar { connect, disconnect, callService } (samma instans)
  HomeView          -> useHomeAssistant() -> returnerar { connect, disconnect, callService } (samma instans)
  haServiceCaller.current -> pekar alltid pa singleton callService
```

| Fil | Andring |
|-----|---------|
| `src/hooks/useHomeAssistant.ts` | Flytta wsRef, connect, disconnect, callService till modul-niva singleton |

En enda filandring loser hela problemet.
