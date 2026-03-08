

# Plan: Golvnivå-begränsning + Vägg-normal-fix

## Problem 1: Objekt kan placeras under marken

Enheter och möbler (props) kan dras eller ställas in med negativ Y-position via slider och drag-and-drop. Det ska vara omöjligt att gå under 0 i byggläge.

### Ändringar

**A. BuildInspector.tsx — Enhetens Y-slider (rad 940)**
- Ändra `min={0}` (redan 0, men lägg till clamp i `onValueChange` för säkerhet)

**B. Props3D.tsx — Drag-handler (rad 243-246)**
- Clampa `position[1]` till `Math.max(0, ...)` vid drag

**C. PropsPanel.tsx — Skala-slider**
- Redan OK (scale, inte position)

**D. BuildInspector.tsx — Prop Y-slider (om det finns)**
- Verifiera att alla numeriska Y-inputs clampar till ≥ 0

**E. useCanvas2DTools / BuildCanvas2D — 2D drag av props och devices**
- Vid `updateProp` och `updateDevice` i drag-move: behåll befintligt `position[1]` (redan gör det, OK)

**F. BuildScene3D.tsx — Device Y-beräkning (rad 143-147)**
- Automatiska Y-beräkningar (`yPos = elev + 2.2` etc.) ger redan positiva värden — OK
- Lägg till `Math.max(0, ...)` som säkerhetsnät

---

## Problem 2: Väggmaterial appliceras på fel sida

### Rotorsak
`setRoomMaterial` i store (rad 598-619) beräknar vilken sida av väggen som vetter mot rummet genom:
1. Beräkna rummets centroid
2. Beräkna väggens vänster-normal (baserat på `from→to`-riktningen)
3. Dot-product för att avgöra om rummet är på vänster eller höger sida

Problemet: väggens `from→to`-riktning bestäms av hur användaren ritade den — den har ingen relation till rummets polygon-vinkling. Två väggar som delar samma rum kan ha motsatta `from→to`-riktningar, vilket gör att `leftMaterialId` ibland hamnar på utsidan.

### Lösning
Förbättra `setRoomMaterial` så att den använder **rummets polygon-vinkling** istället för den lagrade `from→to`-riktningen. Algoritmen:

1. Ta rummets polygon (som har konsekvent vinkling från `findMinimalCycles`)
2. För varje vägg i rummet: hitta vilken riktning den har **i polygonens kontext** (dvs. vilken ordning polygon-segmentet traverserar väggen)
3. Baserat på den riktningen, beräkna vilken sida (left/right) som är insidan

Konkret implementation i `useAppStore.ts` `setRoomMaterial`:

```
// Steg 1: Iterera polygonens kanter för att bestämma riktning
for each consecutive pair (polygon[i], polygon[i+1]):
  find matching wall
  determine if wall.from→to matches polygon direction or is reversed
  if polygon is CCW: inside = right side when matching, left when reversed
  if polygon is CW: opposite
```

Enklare approach: beräkna signed area av polygonen för att bestämma CW/CCW, sedan använda polygon-kantens normal (som alltid pekar inåt för CW) istället för godtyckliga wall.from→to.

### Filer som ändras

1. `src/store/useAppStore.ts` (rad 590-631) — Ny logik i `setRoomMaterial` som använder polygon-kanter istället för wall from/to
2. `src/components/build/Props3D.tsx` — Clampa Y ≥ 0 vid drag
3. `src/components/build/BuildInspector.tsx` — Clampa Y-slider min till 0 och value till ≥ 0

### Version
Ingen version-bump — detta är en bugfix inom 0.4.0-cykeln.

