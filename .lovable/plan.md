# Arbetsplan: Persistent 3D Runtime & Optimering

## Status: ✅ Implementerat (v1.6.0)

---

## Fas 0 — Bygg-stabilisering ✅ DONE
- Fixat import i Scene3D till `./build/KitchenFixture3D`
- Raderat duplikat `KitchenFixtureObject3D.tsx`

## Fas 1 — Buggar och regressioner ✅ DONE

### 1.1 Väggar: 90-gradersstöd vid ritning ✅
- Axis-aligned snapping (±3° av 0/90/180/270°) i `BuildScene3D.tsx`
- Visuell indikator: cyan linje + solid (ej dashed) + "90°"-label via `<Html>`
- `cursorAxisAligned`-prop tillagd i `WallDrawing3D.tsx`

### 1.3 Dörr-öppningsriktning ✅
- `flipped` appliceras nu på dörrpanelens position och rotation i `wallGeometry.tsx`
- Gångjärnspunkt beräknas baserat på `flipped`-flagga

### 1.4 Dörrens öppningsgrad ✅
- `openAmount?: number` (0-1) tillagd på `WallOpening` i `types.ts`
- Slider "Öppningsgrad" i OpeningInspector (dörrar + garageportar)
- 3D: dörrblad roteras runt gångjärnspunkt baserat på `openAmount * π/2`
- TODO: koppla till `haEntityId` för automatisk HA-sync

### 1.5 Ljus går igenom väggar ✅ (pragmatisk lösning)
- Alla ljustyper: minskad distance + decay=2
- ceiling: 5m, strip: 6m, spot: 6m/π/7 angle, wall: 5m/π/4 angle
- Dokumenterat: fullständig ljusblockering kräver baked lighting

## Fas 2 — UX-förbättringar ✅ DONE

### 2.1 Sliders med exakt värdeinmatning ✅
- Ny `SliderWithInput`-komponent (`src/components/ui/SliderWithInput.tsx`)
- Klickbart värde → number input med Enter/Escape/blur
- Applicerad i OpeningInspector (bredd, höjd, bröstning, position, öppningsgrad)

### 2.2 Möbelfliken stängd som standard ✅
- Inredning startar med `select`-verktyg (inte `furnish`)
- Katalogen visas bara när Möbler eller Wizard-verktyg är aktivt

### 2.3 Måla-fliken flyttad till Inredning ✅
- `paint`-verktyg borttaget från `planritningTools`
- Tillagt i `inredningTools` som "Måla" med Paintbrush-ikon
- SurfaceEditor visas under Inredning-fliken

### 2.4 Väggar: bara färger (inga texturer) ✅
- SurfaceEditor filtrerar vägg-material till enbart `paint`-kategorin
- 15 nya väggfärger tillagda (mjuk rosa, oliv, skifferblå, etc.)
- Golv behåller alla texturer som tidigare

## Fas 3 — Dokumentation och mappstruktur ✅ DONE
- `public/textures/guide/README.md` uppdaterad med korrekt mappstruktur
- Borttagen felaktig referens till `public/textures/floor/`
- Target-paths tillagda per preset
- `public/textures/carpet/` skapad

## Fas 4 — Import/Export och long-press ✅ DONE

### 4.2 Exportera från Bibliotek ✅
- "Exportera"-knapp tillagd i BibliotekWorkspace detaljpanel
- Exporterar metadata som JSON-fil

### 4.3 Hold-long på enheter i hemmenyn ✅
- 500ms long-press → popup med av/på + ljusstyrka-slider
- Fungerar för alla enheter med extra kontroll för `light`

## Fas 5 — Troubleshooting-pass ✅ DONE
- Raderat dead code: `PaintTool.tsx` (ersatt av inline SurfaceEditor)
- KitchenFixtureObject3D redan borttagen
- Inga oanvända importer kvar
- Tester passerar

## Fas 6 — Version 1.1.0 ✅ DONE
- `package.json` bumpat till 1.1.0

## Bevarat
- Design / Planritning / Inredning / Bibliotek-struktur
- Save/load kompatibilitet
- HA-sync (ej ändrad)
- Golv-texturer med ambientCG CDN-thumbnails
- Vägg-mitering och hörn-geometri
