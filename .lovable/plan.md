

# Arbetsplan: Stabilisering, buggfixar och UX-förbättringar

---

## Fas 0 — Kritisk: Bygg-stabilisering (bygget går inte igenom)

**Typ: Bugg/regression**

Projektet har två duplicerade köksfiler som orsakar resolver-fel:
- `KitchenFixture3D.tsx` (332 rader) — importeras av `BuildScene3D.tsx`
- `KitchenFixtureObject3D.tsx` (323 rader) — importeras av `Scene3D.tsx`

**Åtgärd:**
1. Ta bort `KitchenFixtureObject3D.tsx` (duplikat)
2. Uppdatera `Scene3D.tsx` rad 18 till `import KitchenFixture3D from './build/KitchenFixture3D'`
3. Verifiera att `BuildScene3D.tsx` rad 15 redan pekar på `./KitchenFixture3D`
4. Köra `vite build --mode development` och bekräfta grön build

---

## Fas 1 — Buggar och regressioner

### 1.1 Väggar: 90-gradersstöd vid ritning
**Typ: UX-förbättring**

`WallDrawing3D.tsx` och `BuildScene3D.tsx` har redan Shift-snapping men saknar visuell 90°-indikator.

**Åtgärd:**
- I `handleGroundPointerMove` (BuildScene3D rad 189-214): beräkna vinkel mellan senaste noden och cursor. Om vinkeln är inom ±2° av 0/90/180/270°, tvinga till exakt 90° och skicka en `cursorAxis`-flagga.
- I `WallDrawing3D.tsx`: byt linjefärg till cyan/blå (`#38bdf8`) och gör linjen solid (ej dashed) när `cursorAxis` är true.
- Visa en liten "90°"-label vid cursorn via `<Html>` (drei).

### 1.2 Vägg-hörn och T-korsningar (regression)
**Typ: Bugg/regression**

Mitering-logiken i `wallGeometry.tsx` (rad 125-200, `computeMiterOffsets`) kan ge platta ändar vid T-korsningar med fönster-delning. Fönstrets segment-splittring i `generateWallSegments` stör mitern.

**Åtgärd:**
- Granska `generateWallSegments` och säkerställ att yttre segment (first/last) behåller sina miter-offsets efter opening-splittring.
- Testa specifikt: L-hörn, T-korsning, +-korsning med och utan fönster.
- Jämför med befintlig `computeWallMitering` (rad 71-103) — den äldre funktionen kan ha en fallback som saknas i den nya.

### 1.3 Dörr-öppningsriktning ("Vänd in/ut" fungerar inte)
**Typ: Bugg**

`OpeningInspector` (BuildInspector.tsx rad 174-178) sätter `flipped: boolean` men 3D-renderingen i `wallGeometry.tsx` ignorerar troligen detta fält för dörrens visuella rotationsriktning.

**Åtgärd:**
- I `generateWallSegments` (wallGeometry.tsx), hitta dörrgeometrin och applicera `flipped` som en spegelvändning av dörrbladets mesh (scale.x = -1 eller rotation.y += π).
- Verifiera att garage-doors också respekterar `flipped`.

### 1.4 Dörrens öppningsgrad
**Typ: UX-förbättring / framtidsförberedelse**

Idag har dörrar inget `openAmount`-fält.

**Åtgärd:**
- Lägg till `openAmount?: number` (0-1) på `WallOpening` i `types.ts`.
- I `OpeningInspector`: lägg till en slider "Öppningsgrad" (0-100%).
- I 3D-renderingen: rotera dörrbladet runt sin gångjärnspunkt baserat på `openAmount * Math.PI/2`.
- Framtid: koppla till `haEntityId` för automatisk sync (dokumentera som TODO).

### 1.5 Ljus går igenom väggar
**Typ: Bugg / Three.js-begränsning**

Three.js `pointLight` och `spotLight` respekterar inte geometriska barriärer — ljus passerar alltid genom mesh. Det finns ingen inbyggd lösning i real-time rendering.

**Åtgärd (pragmatisk):**
- Begränsa `distance` på alla ljustyper till max rumsdiameter (beräkna från rumpolygon om tillgängligt).
- Sätt `decay: 2` konsekvent (fysisk falloff) för snabb dämpning.
- För spotlights: begränsa `angle` ytterligare.
- Dokumentera att ljusblockering genom väggar är en känd Three.js-begränsning och att fullständig lösning kräver baked lighting eller raytracing.

---

## Fas 2 — UX-förbättringar

### 2.1 Sliders med exakt värdeinmatning
**Typ: UX-förbättring**

I `BuildInspector.tsx` visas slider-värden som `<span>` (t.ex. rad 116). Dessa ska bli redigerbara.

**Åtgärd:**
- Skapa en `SliderWithInput`-komponent som kombinerar `<Slider>` + `<Input type="number">`.
- Ersätt alla slider+span-kombinationer i OpeningInspector, WallInspector, PropInspector, DeviceInspector, KitchenFixtureInspector.

### 2.2 Möbelfliken öppen av sig själv i Inredning
**Typ: Bugg**

I `BuildModeV2.tsx` renderas `AssetCatalog` troligen alltid i inredningsfliken oavsett om användaren aktivt har öppnat den.

**Åtgärd:**
- Granska sidopanelens render-logik i inredningsfliken.
- Lägg till en `showCatalog`-state som default=false i inredning.
- Katalogen öppnas bara via explicit klick på möbelverktyget.

### 2.3 Flytta Måla-fliken till Inredning
**Typ: UX-förbättring**

`PaintTool.tsx` och `SurfaceEditor` (BuildModeV2 rad 1344-1643) ligger under Planritning. Ska flytta till Inredning.

**Åtgärd:**
- I BuildModeV2: flytta `SurfaceEditor`-renderingen från planritning-panelen till inredning-panelen.
- Behåll `PaintTool.tsx` (kan raderas om `SurfaceEditor` är den som används i praktiken — kontrollera om det finns dubblering).
- Kolla om `PaintTool.tsx` och `SurfaceEditor` är dubbletter (de gör samma sak) — ta bort den som inte används.

### 2.4 Ta bort texturer från väggar, behåll bara färger
**Typ: UX-förbättring / prestanda**

I `materials.ts` finns wallpaper/tile/stone/texture-presets med `hasTexture: true` och `mapPath`. Dessa laddar texturbilder som laggar.

**Åtgärd:**
- I SurfaceEditor (väggläge): filtrera bort material med `hasTexture: true` eller visa bara `surfaceCategory === 'paint'` plus ev. utökade färger.
- Lägg till fler färgvarianter i `presetMaterials` (10-15 nya paint-färger).
- Behåll texturer för golv.

---

## Fas 3 — Dokumentation och mappstruktur

### 3.1 Texturer: Guide vs verklighet
**Typ: Dokumentation**

Guide (`public/textures/guide/README.md`) säger att golvtexturer ska placeras i `public/textures/floor/` — men den mappen finns INTE. Mappstrukturen har:
```
public/textures/
├── stone/       (5 filer: concrete_diff, limestone_diff, etc.)
├── texture/     (5 filer: limewash_diff, stucco_diff, etc.)
├── tile/        (6 filer: dark_tile_diff, marble_diff, etc.)
├── wallpaper/   (5 filer: grasscloth, linen, silk)
├── wood/        (4 filer: herringbone, oak, pine, walnut)
└── guide/       (README.md)
```

Inget `floor/`-directory. Material-definitionen i `materials.ts` refererar till sökvägar som `/textures/tile/...`, `/textures/wood/...` etc.

**Åtgärd:**
- Uppdatera `README.md` guide: ta bort referensen till `public/textures/floor/` och förklara att texturer placeras i respektive kategori-mapp (`wood/`, `tile/`, `stone/`, `texture/`, `carpet/`).
- Skapa `public/textures/carpet/` (saknas men refereras i guiden).
- Lista exakta filnamn som varje material-preset förväntar sig.

### 3.2 Övrig dokumentation
- Uppdatera `docs/03-using-the-dashboard.md` och `docs/04-performance-and-3d.md` för att reflektera:
  - Att Måla finns under Inredning (inte Planritning)
  - Att väggar bara har färger (ej texturer)
  - Dörrens öppningsgrad
  - 90°-stöd vid väggritning

---

## Fas 4 — Import/Export och framtidsförberedelser

### 4.1 Dev-läge: modeller kan inte laddas
**Typ: Bugg**

I dev-läge (Lovable sandbox) sparas modeller som blob-URL:er eller base64. Blob-URL:er överlever inte sidnavigering/reload.

**Åtgärd:**
- Verifiera att `base64`-fallback alltid aktiveras i dev-mode (ApiClient detekterar DEV).
- I `ImportCatalog.handleModel` (BuildModeV2 rad 966-998): säkerställ att `fileData` (base64) alltid sätts i DEV-läge.
- I `Props3D`/`ImportedHome3D`: konvertera base64 till blob-URL vid render-tid om URL saknas.

### 4.2 Exportera möbler från Bibliotek
**Typ: UX-förbättring**

**Åtgärd:**
- I `BibliotekWorkspace`: lägg till en "Exportera"-knapp per asset.
- För user-assets: skapa en nedladdbar JSON (metadata) + GLB-fil via blob.
- För curated: exponera `/catalog/{model}`-sökvägen som direkt nedladdningslänk.

### 4.3 Hold-long på enheter i hemmenyn
**Typ: UX-förbättring**

I `HomeView.tsx` (rad 74-97) finns enhetskort utan long-press.

**Åtgärd:**
- Lägg till `onPointerDown`/`onPointerUp` med 500ms-timer.
- Vid long-press: visa en popup/sheet med ljusstyrke-slider (för `light`), av/på-knapp, och eventuellt färgtemperatur.
- Implementera för alla `TOGGLEABLE_KINDS`.

---

## Fas 5 — Troubleshooting-pass

### Fullständig genomgång:
1. **Dubblettfiler**: `KitchenFixture3D.tsx` + `KitchenFixtureObject3D.tsx` — ta bort duplikaten.
2. **Dubblettlogik**: `PaintTool.tsx` (structure/) vs `SurfaceEditor` (inline i BuildModeV2) — gör samma sak. Ta bort `PaintTool.tsx` om den inte används separat.
3. **Oanvända importer**: Granska alla filer i `src/components/build/` för dead imports.
4. **Gamla workarounds**: Flera "inlined to avoid Vite cache issues"-kommentarer i BuildModeV2 (rad 48, 124, 1074) — dessa bör dokumenteras eller refaktoreras om de inte längre behövs.
5. **Console-fel**: Kör preview och kontrollera console.log/warn/error.
6. **Build**: Verifiera `npm run build` utan fel.

---

## Fas 6 — Versionering och release

Om allt ovan är stabilt:
1. Bumpa `package.json` version till `1.1.0`
2. Uppdatera `CHANGELOG.md` med alla ändringar
3. Uppdatera docs: `03-using-the-dashboard.md`, `04-performance-and-3d.md`, `07-troubleshooting.md`, `08-developer-notes.md`
4. Uppdatera textur-guiden (`public/textures/guide/README.md`)

---

## Prioriteringsordning

```text
Fas 0  Bygg-stabilisering          [KRITISK — inget annat kan testas utan detta]
Fas 1  Buggar/regressioner          [Hög — direkt påverkar befintliga funktioner]
Fas 5  Troubleshooting-pass         [Parallellt med Fas 1]
Fas 2  UX-förbättringar             [Medium — förbättrar men bryter inte]
Fas 3  Dokumentation/mappstruktur   [Medium — stöd för användare]
Fas 4  Import/Export + long-press   [Lägre — ny funktionalitet]
Fas 6  Version/release              [Sist — efter verifiering]
```

Fas 0 gör jag först eftersom projektet inte kan byggas alls just nu. Sedan Fas 1 + 5 parallellt, följt av resten i ordning.

