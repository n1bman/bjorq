

# Fix: HA-kommandon skickas inte fran appen

## Problemet

Konsolloggarna visar tydligt: **"No callService available"** varje gang du trycker pa SPOT 2. Orsaken ar att `useHomeAssistant()`-hooken (som skapar WebSocket-anslutningen och exponerar `callService`) bara ar monterad i **HAConnectionPanel** -- en instellningspanel som inte ar synlig pa hemskermen. Sa fort du lamnar den panelen forsvinner WebSocket-anslutningen.

## Losning

Flytta `useHomeAssistant` till en hogre niva sa att WebSocket-anslutningen lever kvar sa lange appen ar oppen, inte bara nar installningspanelen visas.

### Andringar

**`src/hooks/useHomeAssistant.ts`**
- Lagg till auto-reconnect-logik: om det finns sparade `wsUrl` och `token` i storen vid mount, anslut automatiskt
- Exportera hooken som en "connection manager" som kan monteras pa toppniva

**`src/components/home/HomeView.tsx`**
- Montera `useHomeAssistant()` har sa att WebSocket-anslutningen ar aktiv nar hemvyn visas
- Hooken satter `haServiceCaller.current = callService` automatiskt, sa bridgen far tillgang

**`src/components/build/BuildModeV2.tsx`**
- Montera `useHomeAssistant()` aven har sa att anslutningen ar aktiv i bygglage

**`src/components/home/cards/HAConnectionPanel.tsx`**
- Behall UI:t for att visa status och koppla in/ur, men anvand den delade anslutningen istallet for att skapa en egen
- Anropa `connect`/`disconnect` som vanligt -- de styr samma globala WebSocket

### Resultat

- WebSocket-anslutningen lever sa lange du ar pa hemskermen eller i bygglaget
- `haServiceCaller.current` ar alltid satt nar HA ar anslutet
- Nar du trycker pa SPOT 2 skickar bridgen kommandot till HA direkt

