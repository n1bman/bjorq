

# Byggläge: Förbättringar och bugfixar

Baserat på dina bilder och feedback har jag identifierat sex områden att åtgärda:

---

## 1. Mätverktyg saknas i dockan

Mätverktyget (`measure`) finns i canvas-logiken men saknas i `BuildBottomDock`. Det behöver läggas till som en dock-knapp, förslagsvis bredvid Import eller som ett eget verktyg med `Ruler`-ikon.

**Fil:** `src/components/build/BuildModeV2.tsx`
- Lägg till `{ tool: 'measure', tab: 'structure', label: 'Mät', icon: Ruler }` i `dockItems`-arrayen
- Importera `Ruler` från lucide-react

---

## 2. Avbryt/Ångra vid väggritning

Det finns ingen Escape-hantering eller "ångra senaste punkt"-funktion under väggritning. Keyboard-shortcuts nämner Escape men det är inte implementerat.

**Fil:** `src/components/build/BuildCanvas2D.tsx`
- Lägg till `useEffect` med `keydown`-lyssnare:
  - **Escape**: Avbryt hela väggritningen (`setWallDrawing({ isDrawing: false, nodes: [] })`)
  - **Ctrl+Z under ritning**: Ta bort senaste noden (`nodes.slice(0, -1)`) — om bara en nod kvar, avbryt helt
- Uppdatera statusbar-texten att visa "Esc: avbryt · Ctrl+Z: ångra punkt"

---

## 3. Rumsnamn — alla heter "Rum 1"

Rum-detekteringen i `roomDetection.ts` räknar med `roomCounter` men startar alltid på `(existingRooms?.length ?? 0) + 1`. Problemet: om alla befintliga rum heter "Rum 1" (från en bugg eller tidig version) skapas nya med "Rum 2" men matchade rum behåller sitt gamla namn via overlap-match.

Namning fungerar redan i RoomInspector (klicka på rum → redigera namn). Men för bättre UX:

**Fil:** `src/components/build/BuildCanvas2D.tsx`
- Gör rumsnamn-label klickbar (dubbelklick) för inline-redigering direkt i 2D-vyn
- Alternativt: visa en tydligare tooltip "Klicka på rum för att byta namn"

**Fil:** `src/lib/roomDetection.ts`
- Fixa namngivning: använd en unik räknare som kontrollerar att namnet inte redan finns bland befintliga rum

---

## 4. Texturer/färger blöder mellan rum

Bilderna visar att väggfärger (orange/mörk) från ett rum syns på angränsande rums väggar. Problemet: `wallMaterialId` på en vägg sätts globalt (hela väggen), men en vägg kan gränsa till två rum. `interiorMaterialId` hanterar bara en insida.

**Nuvarande lösning:** Varje vägg har `materialId` (utsida) och `interiorMaterialId` (insida). Men en delad vägg mellan två rum applicerar samma interior-material på båda sidor mot rummen.

**Fil:** `src/components/build/Walls3D.tsx` + `src/store/types.ts`
- Utöka `WallSegment` med `leftMaterialId` och `rightMaterialId` (baserat på normalriktning) istället för ett enda `interiorMaterialId`
- Rendera varje sida av väggen med sin respektive material
- Uppdatera `setRoomMaterial(target: 'wall')` att sätta rätt sida baserat på vilken sida av väggen rummet är

Detta är den mest komplexa ändringen och kräver uppdatering av wall-rendering, room-material-setter och inspektören.

---

## 5. "Synka & Optimera"-knapp

En knapp för att köra uppsnyggning av 3D-modellen efter att alla väggar och fönster är klara.

**Fil:** `src/components/build/BuildTopToolbar.tsx` (eller ny komponent)
- Lägg till en "Optimera"-knapp som:
  - Kör `detectRooms()` med uppdatering
  - Identifierar och sammanfogar dubbelväggar (väggar med nästan identisk from/to)
  - Tar bort korta väggsegment (<5cm)
  - Visar en sammanfattnings-toast ("3 dubbelväggar borttagna, 5 rum detekterade")

---

## 6. Möbelkatalogen (bild 5) — dubblerad + saknar borttagning

FurnishCatalog renderas dubbelt (rad 228-229 i BuildModeV2.tsx: `{activeTool === ('furnish' as any) && <FurnishCatalog />}` duplicerad).

**Fil:** `src/components/build/BuildModeV2.tsx`
- Ta bort den duplicerade raden 229
- Lägg till delete-knapp i FurnishCatalog-items (finns redan i FurnishTools men inte i den inlinade katalogen i dockan)

---

## Prioritetsordning

1. Dubblerad FurnishCatalog (quickfix, 1 rad)
2. Mätverktyg i dockan (quickfix, 2 rader)
3. Escape/Ångra vid väggritning (medel)
4. Rumsnamn-fix (medel)
5. Synka & Optimera-knapp (medel)
6. Texturblödning per sida (komplex — kräver schema-ändring)

