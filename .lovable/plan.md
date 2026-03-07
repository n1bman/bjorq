

# Fix: Rum detekteras inte + du ska inte behöva börja om

## Problem

Två separata buggar:

### 1. EPSILON för liten (0.05m) — väggar ritade innan snap-funktionen fungerar inte ihop
Väggar som ritades innan node-snapping lades till kan ha endpoints som är upp till 0.20m ifrån varandra. Men `EPSILON = 0.05` i roomDetection kräver att de är inom 5cm. Resultat: grafen ser inte att väggarna hänger ihop → rum detekteras inte.

### 2. wallIds-lookup söker i fel vägglista
I `detectRooms()` söker rad 301 efter wall IDs i den **ursprungliga** vägglistan (`walls`), men cyklerna byggs från `splitWalls`. Efter T-junction-split har de nya segmenten andra koordinater → wallIds blir tomma → rummet saknar koppling till väggar.

## Lösning (ingen rivning behövs)

### A. Lägg till "Heal Walls"-funktion
Ny funktion som **automatiskt** justerar alla befintliga vägg-endpoints:
- Gruppera alla endpoints som ligger inom 0.20m av varandra
- Snappa dem alla till samma koordinat (centroid av gruppen)
- Kör automatiskt vid `detectRooms()` som pre-processing

### B. Öka EPSILON till 0.15m
Ger mer marginal för noder som är "nästan" ihop. Kombinerat med heal-steget löser detta alla befintliga planer utan att behöva rita om.

### C. Fixa wallIds-lookup
Sök i `splitWalls` istället för `walls` vid wallId-matchning, så att rum korrekt kopplas till väggsegmenten.

### D. Lägg till "Hela väggar"-knapp i UI
En knapp i BuildTopToolbar som kör heal-funktionen manuellt + re-detekterar rum. Visar en toast med antal justerade noder.

### Ändrade filer
1. `src/lib/roomDetection.ts` — heal-funktion, öka EPSILON, fixa wallIds-lookup
2. `src/components/build/BuildTopToolbar.tsx` — "Hela väggar"-knapp

