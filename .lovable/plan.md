

# Fix: Rumshantering och per-sida väggfärger

## Problem 1 — Alla rum heter "Rum 1" + golvfärg ändras på alla

Buggen i `detectRooms`: overlap-matchningen markerar INTE befintliga rum som "använda". Flera nya rum kan matcha samma gamla rum → de får samma `id`. När `setRoomMaterial` körs på det ID:t ändras alla rum med det ID:t.

**Fix i `src/lib/roomDetection.ts`:**
- Lägg till en `usedExistingIds`-Set som spårar vilka befintliga rum som redan matchats
- Hoppa över redan matchade rum i overlap-loopen
- Ge omatchade rum unika namn med den befintliga räknaren

## Problem 2 — Väggfärg blöder till andra sidan

Per-side-systemet (`leftMaterialId`/`rightMaterialId`) är implementerat men `resolveWallColors` faller tillbaka på `materialId`/`interiorMaterialId` för sidan som INTE har explicit material. Om en vägg har `materialId` satt (t.ex. orange) och du sätter `leftMaterialId` till grönt, blir vänster sida grön men höger sida faller tillbaka till orange via `extMat`. Det fungerar korrekt tekniskt — men om användaren satte `materialId` via room A:s wallMaterialId, syns den på room B:s sida.

**Fix i `src/store/useAppStore.ts` (`setRoomMaterial`):**
- Sluta sätta `wallMaterialId` på room-objektet (det är redundant nu med per-side)
- Sätt BARA `leftMaterialId` eller `rightMaterialId` på väggen

**Fix i `src/lib/wallMaterials.ts` (`resolveWallColors`):**
- Låt `leftMaterialId` och `rightMaterialId` vara helt oberoende — om en sida inte har material, använd default (inte den andra sidans material)

## Problem 3 — Rum-hanteringsmeny saknas

Lägg till en dedikerad rumsöversikt i bygglägets vänsterpanel (under "Struktur"-tabben) som en lista med alla rum, där man kan:
- Byta namn inline
- Se area
- Klicka för att välja rummet i 2D/3D

**Ny komponent `src/components/build/RoomManager.tsx`:**
- Lista alla rum med namn (editerbart), area, golv-/väggfärg-indicators
- Klick markerar rummet (`setSelection({ type: 'room', id })`)
- Visa i `BuildLeftPanel.tsx` under structure-tabben

## Filer att ändra

1. `src/lib/roomDetection.ts` — Track used existing rooms to prevent duplicate IDs
2. `src/store/useAppStore.ts` — Remove redundant `wallMaterialId` set on room in `setRoomMaterial`
3. `src/lib/wallMaterials.ts` — Make left/right fallbacks independent (default beige, not cross-side)
4. `src/components/build/RoomManager.tsx` — New room overview panel
5. `src/components/build/BuildLeftPanel.tsx` — Include RoomManager in structure tab

