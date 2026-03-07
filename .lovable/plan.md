

# Build Mode -- Fullständig Analys och Implementationsplan

## 1. Nuvarande Systemanalys

### Vad som fungerar bra
- Segment-baserat väggsystem med nod-koppling, grid-snapping, split, drag
- Rumsystem med detektering, rektangelritning, namngivning, material
- Dörrar/fönster som openings med offset, bredd, höjd, drag längs vägg
- 3D-rendering: Walls3D, Floors3D, Ceilings3D, Stairs3D, Props3D
- Undo/redo med 20-nivåers snapshotar
- 2D planvy med full verktygslåda
- Props-katalog med GLB-import, position/rotation/skala
- 25+ enhetstyper med HA-koppling
- Kontextuell inspektör per selektionstyp

### Kritiska svagheter

**S1: Monolitisk BuildCanvas2D (1348 rader)**
En enda fil hanterar rendering, alla verktyg, drag-and-drop, touch, zoom, panning. Omöjlig att underhålla eller utöka säkert.

**S2: Undo/Redo täcker bara LayoutState**
`pushUndo()` sparar bara `layout` (väggar/rum/trappor). Enheter, props och material inkluderas inte. Ångra efter möbelplacering gör ingenting.

**S3: Ingen wall-view-mode**
Inga "Walls Up/Cutaway/Down/Room Focus"-lägen. Väggar visas alltid fullt i 3D.

**S4: Rum-detektering är manuell och fragil**
Användaren måste klicka "Detektera rum". Algoritmen klarar inte T-korsningar. Rum-namn och material förloras vid omdetektering.

**S5: Dörrar/fönster saknar 3D-modeller**
Openings renderas som gap i väggar utan karmar eller glas. Inget stöd för garageport-typ.

**S6: Duplicerad logik 2D/3D**
Wall-drawing, device-placement, snap-to-grid finns separat i Canvas2D och Scene3D.

**S7: Inget referensritning-stöd**
Kan inte ladda upp planritningar/bilder att rita ovanpå.

**S8: Ingen multi-select**
Bara ett objekt i taget. Ingen box-select, Ctrl+klick eller gruppoperationer.

**S9: Inget mark/omgivningssystem**
Huset står på en oändlig mörk plan. Inget gräs, betong, träd.

**S10: Material-systemet är begränsat**
Bara 13 förinställda material. Inga egna texturer. Ingen texture-mapping.

**S11: Dashboard-synk ofullständig**
Scene3D i hemläget delar rendering men saknar wall-view-modes och visar inte alltid alla ändringar.

---

## 2. Föreslagen Arkitektur -- 7 Sprints

### Sprint 1: Canvas2D Refaktorisering + Undo/Redo Fix

**1A: Bryt upp BuildCanvas2D**

```text
src/components/build/canvas2d/
├── Canvas2DView.tsx          -- Huvudkomponent, canvas-setup, orchestrator
├── useCanvas2DCamera.ts      -- Pan, zoom, scroll, pinch-to-zoom
├── useCanvas2DDraw.ts        -- Alla draw-funktioner (grid, walls, rooms, devices, props, measure)
├── useCanvas2DInteraction.ts -- Pointer down/move/up/dblclick handlers per verktyg
├── useCanvas2DDrag.ts        -- Drag-logik (noder, väggar, openings, props, devices)
└── canvas2dConstants.ts      -- COLORS, hjälpfunktioner (pointToSegment, pointInPolygon, snapToGrid)
```

Canvas2DView renderar bara `<canvas>` och kopplar ihop hooks. Varje hook är <300 rader.

**1B: Unifiera snap/grid-logik**

Skapa `src/lib/buildUtils.ts` med delade funktioner som används av båda vyerna:
- `snapToGrid(point, grid)` 
- `findNearestNode(point, walls, threshold)`
- `findWallAt(point, walls, threshold)`
- `pointToSegment()`
- `pointInPolygon()`

**1C: Utöka Undo/Redo**

Ändra undo-stacken till:
```typescript
interface UndoSnapshot {
  layout: LayoutState;
  devices: { markers: DeviceMarker[]; deviceStates: Record<string, DeviceState> };
  props: { catalog: PropCatalogItem[]; items: PropItem[] };
}
```

Alla mutationer (addDevice, removeProp, addOpening, etc.) anropar `pushUndo()` innan ändring. Max 30 snapshots.

---

### Sprint 2: Väggsystem + Live Room Detection

**2A: Live room-detection**

Kör `detectRooms()` automatiskt efter varje vägg-mutation (add, delete, move, split) via debounced callback (200ms). Ta bort "Detektera rum"-knappen.

Förbättringar:
- Hantera T-korsningar: automatisk vägg-split vid korsningspunkter
- Bevara befintliga rum-namn och material vid omdetektering genom polygon-overlap-matchning
- Minsta area-tröskel: 0.5 m²

**2B: Förbättrad väggritning**

- **Angle-lock**: Shift-tangent låser till 0°/45°/90°
- **Längd-tooltip**: Visa meter-värde i realtid vid wall-draw (inte bara measure-verktyget)
- **Auto-close**: Om sista noden är nära (<0.3m) första noden, stäng polygonen och skapa rum direkt
- **Escape**: Avbryt pågående ritning

**2C: Wall View Modes**

Ny typ i `BuildView`:
```typescript
type WallViewMode = 'up' | 'cutaway' | 'down' | 'room-focus';
```

I Walls3D: `cutaway` klipper vägghöjd till 1.2m, `down` döljer väggar helt, `room-focus` visar bara väggar runt markerat rum. Fyra knappar i toolbar.

---

### Sprint 3: Dörrar, Fönster och Garageportar

**3A: Utöka WallOpening-typen**

```typescript
interface WallOpening {
  id: string;
  type: 'door' | 'window' | 'garage-door';
  preset: OpeningPreset;
  offset: number;
  width: number;
  height: number;
  sillHeight: number;
  materialId?: string;
  haEntityId?: string;  // för garageport/dörr HA-koppling
  openAngle?: number;   // 0-90, för animering
}

type OpeningPreset = 
  | 'single-door' | 'double-door' | 'sliding-door' | 'french-door'
  | 'single-window' | 'double-window' | 'panorama-window'
  | 'garage-single' | 'garage-double';
```

Varje preset sätter default-mått. Inspektören visar preset-dropdown.

**3B: 3D-modeller för openings**

Ny komponent `Openings3D.tsx`:
- **Dörrar**: Dörrblad (tunn box) + karm (4 tunna boxar). `openAngle` roterar bladet.
- **Fönster**: Glas (`MeshPhysicalMaterial`, `transmission: 0.9`, `roughness: 0.05`) + karm.
- **Garageportar**: Sektionsport-modell, position styrd av HA-entity (`cover` state 0-100).

**3C: 2D-arkitektursymboler**

Rita dörrar som cirkelbågar (standard planritningssymbol) och fönster som dubbla parallella linjer i 2D-canvasen.

---

### Sprint 4: Referensritning + Material + Mark

**4A: Referensritning i planvyn**

Stöd för att ladda upp bild/PDF som referens:
- Ny state i `Floor`: `referenceImage?: { url: string; opacity: number; scale: number; offset: [number, number]; locked: boolean }`
- Renderas under grid men ovanpå bakgrund i Canvas2D
- UI-kontroller: opacity-slider (0-1), skala-slider, drag för att flytta, lås-toggle
- PDF: konvertera första sidan till bild via canvas

**4B: Utökat materialsystem**

Utöka `Material`-typen:
```typescript
interface Material {
  id: string;
  name: string;
  type: 'paint' | 'concrete' | 'wood' | 'tile' | 'metal' | 'stone' | 'custom';
  color: string;
  roughness: number;
  textureUrl?: string;      // för custom textures
  textureRepeat?: [number, number]; // UV repeat
  normalMapUrl?: string;
}
```

Lägg till 15+ nya preset-material (sand, pastelltoner, sten, etc.). UI i PaintTool för att ladda upp egna texturer.

**4C: Mark och omgivning**

Ny state: `GroundState` med marktyp och omgivningsobjekt:
```typescript
interface GroundState {
  material: 'grass' | 'concrete' | 'stone' | 'dirt' | 'road';
  objects: GroundObject[];  // träd, buskar, kantsten
}
interface GroundObject {
  id: string;
  type: 'tree' | 'bush' | 'fence' | 'path';
  position: [number, number];
  rotation: number;
  scale: number;
}
```

GroundPlane uppdateras med material-val. Enkla procedurella 3D-objekt (koner för träd, sfärer för buskar).

---

### Sprint 5: Multi-select, Copy/Paste och UX

**5A: Multi-select**

Utöka `BuildSelection`:
```typescript
interface BuildSelection {
  items: { type: SelectionType; id: string }[];
}
```

- Ctrl+klick: lägg till/ta bort från selektion
- Box-select: dra rektangel i select-verktyg
- Gruppoperationer: flytta, ta bort, duplicera alla markerade

**5B: Copy/Paste och Duplicate**

- Ctrl+C: kopiera markerade objekt till clipboard-state
- Ctrl+V: placera kopior vid cursor med offset
- Ctrl+D: duplicera på plats med 0.5m offset
- Fungerar för väggar, rum, props och enheter

**5C: Keyboard shortcuts**

- Delete: ta bort markerat
- Escape: avbryt pågående operation / avmarkera
- W: väggverktyg
- R: rumverktyg
- D: dörrverktyg
- Ctrl+Z/Y: undo/redo (redan implementerat men formalisera)

---

### Sprint 6: 3D Openings, Dashboard-synk och Garageport-integration

**6A: HA-koppling för openings**

Garageportar, dörrar med lås, och fönster med covers kan kopplas till HA-entities:
- `garage-door` opening → `cover.*` entity → animera öppning/stängning i 3D
- `door` opening → `lock.*` entity → visa låst/olåst-ikon
- Inspector visar entity-picker för openings med `haEntityId`

**6B: Dashboard-synk**

Säkerställ att `Scene3D.tsx` (hemläget) använder samma rendering:
- Importera `Openings3D` i hemscenen
- `wallViewMode` defaultar till `cutaway` i dashboard
- Alla props, enheter, material synkas automatiskt
- Ground material/objects visas i dashboard

---

### Sprint 7: Polish och Stabilitet

**7A: Förbättrad inspektör**

- Dörr/fönster-inspektör: preset-väljare, HA entity-koppling
- Rum-inspektör: HA area-koppling, device-lista, golvyta i m²
- Multi-select-inspektör: gemensamma operationer (flytta, ta bort, material)

**7B: Prestanda**

- Memoize alla draw-funktioner i Canvas2D
- Throttle room-detection till max 1 per sekund
- Virtualisera rendering: bara rita objekt inom viewport

**7C: Projektsparning**

- Validera att all data sparas korrekt: ground, referenceImage, openings med HA
- Lägg till `projectVersion` för framtida migrering
- Synka automatiskt vid väsentliga ändringar (inte vid varje muspekare-rörelse)

---

## 3. Prioritering och Implementation

```text
Sprint  Storlek   Beskrivning
──────  ────────  ─────────────────────────────────────────
  1     Stor      Canvas2D refaktorisering + undo/redo fix
  2     Medel     Live rooms, wall views, angle-lock
  3     Medel     Dörr/fönster/garageport 3D + presets
  4     Medel     Referensritning + material + mark
  5     Medel     Multi-select + copy/paste + shortcuts
  6     Liten     HA-koppling openings + dashboard-synk
  7     Liten     Polish, prestanda, sparning
```

Sprint 1 bör göras först -- den stabiliserar grunden. Sprint 2-5 kan göras i ordning. Sprint 6-7 avslutar.

## 4. Vad som INTE ändras

- Zustand-storen behåller sin struktur (vi utökar, inte ersätter)
- Befintliga typer (`WallSegment`, `Room`, `Floor`, `DeviceMarker`) behålls
- React Three Fiber v8 + Drei v9 behålls
- Server-API ändras inte
- Import-flödet (GLB/GLTF) behålls
- Alla 25+ enhetstyper och deras HA-koppling behålls

