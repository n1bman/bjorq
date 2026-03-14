

# Flytta "Spara vy" från Hemvy till Kontrollpanelens 3D-widget

## Problem
"Spara vy"-funktionen via long-press lades på Hemvyns 3D-bakgrund. Användaren vill ha den på **kontrollpanelens (Dashboard) 3D-widget** istället, utlöst via **dubbelklick** på widgetens ram.

## Ändringar

### 1. `src/components/home/HomeView.tsx`
- **Ta bort** long-press-hanteraren på 3D-containern (rad 93-98: `onPointerDown/Up/Cancel/Leave` med `sceneLongPressRef`).
- **Ta bort** `showSaveView`-state, `sceneLongPressRef`, `Save`-import (om oanvänd), och hela "Save View popup"-blocket (rad 111-132).
- Behåll `cameraRef`-import om den används av annat, annars ta bort.

### 2. `src/components/home/DashboardGrid.tsx`
- Lägg till state: `const [showSaveView, setShowSaveView] = useState(false);`
- Importera `saveHomeStartCamera` från store och `cameraRef`.
- På 3D-widgetens container-div (rad 238), lägg till `onDoubleClick={() => setShowSaveView(true)}`.
- Rendera popup (samma design som fanns i HomeView) under 3D-widgeten:
  - "Spara som startvy?" med Spara/Avbryt-knappar.
  - Spara skriver `cameraRef.position/target` till `homeView.customStartPos/customStartTarget` via `saveHomeStartCamera`.

### Filändringar

| Fil | Ändring |
|-----|---------|
| `src/components/home/HomeView.tsx` | Ta bort long-press spara vy-logik |
| `src/components/home/DashboardGrid.tsx` | Lägg till dubbelklick spara vy på 3D-widget |

