

# Plan: Förbättra vägg-anslutningar och rum-detektering

## Problem (från bilderna)

1. **Noder syns bara i väggritningsläge** — Connection-indikatorerna (gröna/gula ringar) visas bara när `activeTool === 'wall'`. Användaren vill alltid se var väggar ansluter.

2. **Svårt att splitta en vägg och skapa T-korsning** — Dubbelklick i select-läge splittar en vägg, men det skapar bara två separata väggar utan att ansluta dem till intilliggande väggar. Rumdetekteringens `splitAtTJunctions` hanterar detta i grafen, men den visuella feedbacken saknas och det är inte intuitivt.

3. **Rumdetekteringen missar rum** — Bild 1 visar att bara "Rum 3" och "Rum 2" detekteras trots att huset har ~8 rum. Problemet är att `findMinimalCycles` kräver att alla noder har ≥2 grannar (`node.neighbors.length < 2` → break), men T-korsningar skapar noder med 3+ grannar som grafen inte alltid hanterar korrekt efter snapping.

## Lösning

### A. Alltid visa anslutningsindikatorer (BuildCanvas2D.tsx)

Ändra rad 589 — ta bort `if (activeTool === 'wall')` villkoret. Visa alltid gröna ringar för anslutna noder (≥2 väggar) och orange ringar för fria endpoints (1 vägg). Detta ger kontinuerlig visuell feedback.

```text
Nod med 1 anslutning: orange ring (disconnected)
Nod med 2+ anslutningar: grön ring (connected)
```

### B. Automatisk T-junction split vid väggplacering (useAppStore.ts → addWall)

När en ny vägg läggs till, kontrollera automatiskt om någon av dess endpoints landar mitt på en befintlig vägg. Om ja, splitta den befintliga väggen vid den punkten. Detta eliminerar behovet för användaren att manuellt dubbelklicka.

Ny logik i `addWall`:
1. För varje endpoint av den nya väggen: projicera på alla befintliga väggar
2. Om projektionsavståndet < 0.15m och parametern t ∈ (0.02, 0.98): splitta den befintliga väggen
3. Kör `detectRooms` efteråt (redan debounced)

### C. Förbättra splitWall att trigga rumdetektering (useAppStore.ts)

`splitWall` kör idag inte `updateRoomPolygons`. Lägg till att det gör det efter split.

### D. Öka robustheten i findMinimalCycles (roomDetection.ts)

Ändra break-villkoret `node.neighbors.length < 2` till att istället hantera dead-ends mer gracefully — om en nod bara har 1 granne (den vi kom ifrån), break. Men noder med exakt 1 annan granne (= 2 totalt inkl. prev) ska fortfarande kunna traverseras.

Nuvarande kod hoppar redan över `prev` i loopen, men break:ar om det bara finns 1 granne totalt. Problemet uppstår vid dead-ends som inte borde finnas om T-junctions splittades korrekt. Med fix B löses detta indirekt.

## Filer som ändras

1. **`src/components/build/BuildCanvas2D.tsx`** — Visa anslutningsringar alltid (inte bara i wall-tool)
2. **`src/store/useAppStore.ts`** — Auto-split T-junctions i `addWall`, trigga rooms i `splitWall`
3. **`src/lib/roomDetection.ts`** — Minor: hantera noder med 1 granne bättre i cycle-finding

