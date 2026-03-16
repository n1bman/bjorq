

# Fix: Ren geringad (mitered) hörn utan fyllnadsblock

## Problem
Hörnblocken (`generateCornerBlocks`) skapar synliga guldiga/orangea artefakter vid L-hörn. Blocken sticker ut och ser fula ut oavsett geometri.

## Analys
Systemet har redan en fullt fungerande gering (miter) i `computeMiterOffsets` som skär väggändarna diagonalt vid 90°-hörn. För två väggar som möts i 90° beräknas korrekt att vänsterkanten förlängs med `halfThickness` och högerkanten dras in med `halfThickness`, vilket skapar en 45°-skarv. Problemet är att de separata hörnblocken lades till ovanpå detta — de behövs inte och skapar artefakterna.

```text
  NUVARANDE (med block):       FÖRESLAGEN (ren gering):

  ┌─────┐■■┌─────┐            ┌─────┐┌─────┐
  │     │■■│     │            │     /│     │
  │     │■■│     │            │    / │     │
  └─────┘■■│     │            └───/──┘     │
            │     │                │     │
            └─────┘                └─────┘
  ■■ = fyllnadsblock             / = gerad skarv
  (sticker ut)                 (rent möte)
```

## Ändringar

### 1. `src/lib/wallGeometry.tsx` — Miter-padding
Lägg till en liten padding (+0.005) på miter-offsetsen så att väggarna marginellt överlappar vid hörn istället för att lämna mikro-glipor. Ändring i `computeMiterOffsets`, ca 2 rader.

### 2. `src/components/build/InteractiveWalls3D.tsx` — Ta bort corner blocks
Ta bort importen av `generateCornerBlocks`, `useMemo`-anropet, och renderingen av `{cornerBlocks}`. ~5 rader bort.

### 3. `src/components/build/Walls3D.tsx` — Ta bort corner blocks
Samma som ovan — ta bort import, `useMemo`, och rendering av corner blocks. ~5 rader bort.

### 4. Valfritt framtida steg (inte nu)
En "merge walls"-funktion som körs efter bygge kan i framtiden skapa en enda sammanslagen mesh per hörn med CSG (Constructive Solid Geometry). Men det är ett stort projekt — den rena geringen räcker för nu.

## Resultat
Väggarna möts i en ren diagonal skarv utan synliga fyllnadsblock. Ingen ny geometri läggs till — befintlig gering-logik gör jobbet.

