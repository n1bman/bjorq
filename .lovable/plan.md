

# Fix: Golv-flicker (z-fighting)

## Problem
Golven i `Floors3D` renderas med `side={THREE.DoubleSide}` på en nolltjock `shapeGeometry`. När kameran rör sig uppstår z-fighting mellan fram- och baksidan av samma yta — det är det blå/färg-flimrande mönstret du ser.

Dessutom ligger golven (y=0.01) väldigt nära markplanet (y=-0.02) och terränggräset (y=-0.015), vilket kan ge ytterligare flicker vid låga kameravinklar.

## Lösning

### `src/components/build/Floors3D.tsx`
- Byt `side: THREE.DoubleSide` → `THREE.FrontSide` — golv ses bara ovanifrån
- Lägg till `polygonOffset` + `polygonOffsetFactor={-1}` för att ge golven prioritet vid z-depth-konflikter
- Höj golven marginellt: `elevation + 0.02` istället för `+ 0.01`

### `src/components/build/GroundPlane.tsx`  
- Lägg till `polygonOffset` med positiv faktor så att markplanet alltid renderas *bakom* rummens golv

### `src/components/build/Ceilings3D.tsx`
- Ingen ändring behövs (redan `colorWrite={false}, depthWrite={false}`)

Totalt ~5 raders ändring. Ingen ny logik, bara renderingsprioritet.

