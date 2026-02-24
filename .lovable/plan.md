

# Fix Home Assistant-anslutning

## Problem

1. **Fel URL-format**: Användaren anger `wss://xxx.ui.nabu.casa` men HA kräver `/api/websocket` i slutet av URL:en. Appen borde automatiskt lägga till detta.
2. **Placeholder visar ws://**: Placeholder-texten visar `ws://` vilket leder till förvirring -- ska visa `wss://`.
3. **Runtime-fel**: `Cannot read properties of null (reading 'getSnapshot')` i `useHomeAssistant.ts:14` -- detta kan bero på att hooken renderas i en komponent som mountas/unmountas oväntat, eller att store-selektorn inte matchar.

## Ändringar

### `src/hooks/useHomeAssistant.ts`
- I `connect`-funktionen: auto-appenda `/api/websocket` om URL:en inte redan slutar med det
- Auto-konvertera `https://` till `wss://` och `http://` till `ws://` om användaren klistrar in en vanlig URL
- Bättre felmeddelande vid SecurityError (mixed content)

### `src/components/home/cards/HAConnectionPanel.tsx`
- Uppdatera placeholder till `wss://xxx.ui.nabu.casa/api/websocket`
- Visa ett tips/hjälptext under URL-fältet om att URL:en ska vara `wss://` och sluta med `/api/websocket`
- Visa mer specifikt felmeddelande (t.ex. "Använd wss:// för säker anslutning" om ws:// används på HTTPS)

### `src/store/useAppStore.ts`
- Kontrollera att alla HA-actions (`setHAEntities`, `updateHALiveState`, `setHAStatus`, `setHAConnection`) existerar och fungerar korrekt (de verkar finnas, men dubbelkolla initialvärden)

## Teknisk sammanfattning

| Fil | Ändring |
|-----|---------|
| `src/hooks/useHomeAssistant.ts` | Auto-fixa URL (lägg till /api/websocket, konvertera https till wss) |
| `src/components/home/cards/HAConnectionPanel.tsx` | Bättre placeholder, hjälptext, specifika felmeddelanden |

