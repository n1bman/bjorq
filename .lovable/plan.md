

# Fix: Golv-flicker och lager-problem

## Analys

Tre överlappande ytor renderas nära varandra utan korrekt djupseparation:

```text
y = +0.02   ── Rum-golv (Floors3D) — har polygonOffset(-1) ✓
y = -0.015  ── Terräng-gräs (InlineTerrain3D) — SAKNAR polygonOffset ✗
y = -0.02   ── Markplan (GroundPlane) — har polygonOffset(+1) ✓
```

Terrängens gräscirkel (y=-0.015) saknar `polygonOffset` och z-fightar mot markplanet (y=-0.02). Dessutom saknar directionLight `shadow-bias`, vilket ger "shadow acne" — de randiga mönstren på golven.

## Ändringar

### 1. `src/components/Scene3D.tsx` — InlineTerrainEnvironment3D (rad 275-278)
- Lägg till `polygonOffset`, `polygonOffsetFactor={-0.5}`, `polygonOffsetUnits={-0.5}` på gräsmaterialet
- Flytta gräset till y=-0.01 för bättre separation

### 2. `src/components/Scene3D.tsx` — directionalLight (rad 224-227)
- Lägg till `shadow-bias={-0.002}` för att eliminera shadow acne på golven

### 3. `src/components/build/BuildScene3D.tsx` — InlineTerrain3D (rad 297-299)
- Samma fix som ovan: lägg till `polygonOffset` på gräsmaterialet
- Flytta till y=-0.01

### 4. `src/components/build/BuildScene3D.tsx` — directionalLight (rad 230)
- Lägg till `shadow-bias={-0.002}`

Totalt ~8 raders ändring. Ingen ny logik.

