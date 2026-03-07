

# Analys + Version 0.4.0 Release

## Kodanalys — identifierade problem

### 1. Konsol-varningar (forwardRef)
**PerformanceHUD** och **OpeningInspector** (i BuildInspector) ger React-varningen "Function components cannot be given refs". En ref skickas till dessa komponenter utan `forwardRef`. Inte kritiskt men skapar brus i konsolen.

### 2. Duplicerad utility-kod
`pointInPolygon` och `pointToSegment` finns definierade **både** i `BuildCanvas2D.tsx` (rad 40-61) och i `src/lib/buildUtils.ts`. `polygonArea` finns **både** i `BuildTopToolbar.tsx` (rad 21-29) och i `roomDetection.ts`. Bör importeras från en enda källa.

### 3. `generateId` definierat på 4 ställen
- `src/lib/buildUtils.ts`
- `src/lib/roomDetection.ts`
- `src/components/build/BuildCanvas2D.tsx`
- `src/components/build/BuildScene3D.tsx`

Alla bör importera från `buildUtils.ts`.

### 4. healWalls sparar inte till store
Heal-knappen i toolbar kör `healWalls()` och uppdaterar store, men `detectRooms()` kör **också** `healWalls()` internt (rad 334). Det betyder att heal körs dubbelt. Inte farligt men onödig beräkning.

### 5. Node connectivity-ringarnas tolerans (0.02) vs EPSILON (0.15)
I `BuildCanvas2D.tsx` rad 607 jämförs noder med `0.02` precision för att räkna anslutningar, men efter heal/snap kan noder hamna på 0.15-gridpunkter som inte matchar exakt. Bör använda samma tolerans som `EPSILON` (0.15) för korrekt visuell feedback.

### 6. Ingen strukturell bugg i rum-detekteringen
Koden med `healWalls` → `splitAtTJunctions` → `buildGraph` → `findMinimalCycles` ser korrekt ut. Pipeline är solid.

---

## Plan: Version 0.4.0

### Ändringar att göra

**1. Fixa forwardRef-varningar**
- `PerformanceHUD.tsx` — wrappa med `forwardRef`
- `BuildInspector.tsx` — `OpeningInspector` wrappas med `forwardRef`

**2. Eliminera duplicerad kod**
- Ta bort `pointInPolygon`, `pointToSegment` från `BuildCanvas2D.tsx` — importera från `buildUtils.ts`
- Ta bort `polygonArea` från `BuildTopToolbar.tsx` — importera från `roomDetection.ts` (exportera den)
- Ta bort lokala `generateId` i `BuildCanvas2D.tsx`, `BuildScene3D.tsx`, `roomDetection.ts` — importera från `buildUtils.ts`

**3. Fixa node-connectivity-tolerans**
- I `BuildCanvas2D.tsx` rad 607: ändra `0.02` till `0.15` för att matcha `EPSILON`

**4. Ta bort dubbel-heal**
- I `BuildTopToolbar.tsx` heal-knappen: skicka redan healade väggar till `detectRooms` men skippa intern heal (alternativt: acceptera dubbel-heal, det är safe). Enklast: låt `detectRooms` alltid heala internt, knappen kör bara `detectRooms`.

**5. Uppdatera version**
- `package.json` → `"0.4.0"`
- `bjorq_dashboard/config.yaml` → `version: "0.4.0"`
- `CHANGELOG.md` — ny sektion med alla ändringar sedan 0.3.0

### CHANGELOG-innehåll för 0.4.0

```
## [0.4.0] - 2026-03-07

### Added
- Wall node-snapping — new walls snap to existing endpoints (0.25m threshold)
- Mid-wall snapping — snap to any point along an existing wall segment (T-junction support)
- Visual snap indicators: green ring (endpoint), yellow ring with cross (mid-wall)
- Node connection status: green rings for connected nodes (2+ walls), orange for open ends
- T-junction auto-splitting in room detection — inner walls connecting mid-segment now form rooms
- Wall healing system — automatically merges endpoints within 20cm to fix old imprecise walls
- "Heal walls" toolbar button (wrench icon) for manual wall repair with toast feedback

### Fixed
- Room detection failing when walls had microscopic gaps (EPSILON increased from 5cm to 15cm)
- Room detection wall ID lookup searching wrong array after T-junction split
- forwardRef warnings for PerformanceHUD and OpeningInspector components
- Duplicated utility functions across multiple files consolidated to single sources

### Changed
- Node connectivity tolerance aligned with EPSILON (0.15m) for accurate visual feedback
```

### Filer som ändras
1. `package.json` — version bump
2. `bjorq_dashboard/config.yaml` — version bump
3. `CHANGELOG.md` — ny 0.4.0 sektion
4. `src/components/build/BuildCanvas2D.tsx` — ta bort duplicerad kod, fixa tolerans
5. `src/components/build/BuildScene3D.tsx` — ta bort lokal `generateId`
6. `src/lib/roomDetection.ts` — exportera `polygonArea`, ta bort lokal `generateId`
7. `src/components/build/BuildTopToolbar.tsx` — importera `polygonArea` istället för lokal kopia
8. `src/components/home/PerformanceHUD.tsx` — wrappa med `forwardRef`
9. `src/components/build/BuildInspector.tsx` — wrappa `OpeningInspector` med `forwardRef`

