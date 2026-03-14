

# Fix: Planritning-panelen visas bara vid Import-verktyget

## Problem
Import-panelen (Opacitet, Skala, Rotation, Position, Material/Färg) och ReferenceControls visas alltid i Planritning-läget om en modell är importerad — oavsett aktivt verktyg. Den borde bara synas när Import-verktyget är valt.

## Ändringar

### 1. `BuildModeV2.tsx` — rad 2256
Ändra villkoret för `showImportPanel` så att det kräver att `activeTool === 'import'`:
```typescript
// Före:
const showImportPanel = !isBibliotek && activeTab === 'planritning' && isImported;
// Efter:
const showImportPanel = !isBibliotek && activeTab === 'planritning' && isImported && activeTool === 'import';
```

Samma ändring för `showImportOverlay` (rad 2248) — 3D-overlay av importerad modell bör också bara visas vid import-verktyget:
```typescript
// Före:
const showImportOverlay = cameraMode === 'topdown' && isImported && hasImportedUrl;
// Efter:
const showImportOverlay = cameraMode === 'topdown' && isImported && hasImportedUrl && activeTool === 'import';
```

### 2. `BuildCanvas2D.tsx` — rad 807
Ändra `ReferenceControls` villkoret till enbart `activeTool === 'import'`:
```typescript
// Före:
{referenceDrawing?.url && (activeTool === 'import' || useAppStore.getState().build.tab === 'planritning') && <ReferenceControls />}
// Efter:
{referenceDrawing?.url && activeTool === 'import' && <ReferenceControls />}
```

## Resultat
Import-panelen, overlay och referenskontroller dyker bara upp när användaren aktivt valt Import-verktyget i verktygsraden.

