

# Patch v1.7.2 — 8 Fixes

## Fas 1: Kritisk krasch-fix (Grafik & Miljö)

**Problem:** Sidan kraschar vid öppning av Grafik & Miljö. Felet: `Cannot read properties of undefined (reading 'toFixed')`. Persisted store saknar nyare fält (`intensityMultiplier`, `indoorBounce`, `fogDensity`, `atmosphereIntensity`, `exposure`) om de sparades innan dessa lades till.

**Fix:**
- `SunWeatherPanel.tsx`: Lägg till fallback-defaults vid destructuring: `const cal = { intensityMultiplier: 1.0, indoorBounce: 1.0, ...rawCal }` och `const atm = { fogDensity: 0.3, atmosphereIntensity: 1.0, fogEnabled: false, cloudinessAffectsLight: true, dayNightTransition: 'smooth', ...rawAtm }`.
- `GraphicsSettings.tsx`: Guard `perf.exposure?.toFixed(1)` med `(perf.exposure ?? 1.0).toFixed(1)`.

## Fas 2: 90°-vinkelhjälp i planritning

**Problem:** Svårt att rita exakt 90°-väggar. `angleLock` (Shift) snappar till 45°-steg men ger ingen visuell feedback.

**Fix:**
- `BuildCanvas2D.tsx`: I `drawWallPreview` — efter beräkning av snapped cursor, beräkna vinkeln relativt senaste noden. Om vinkeln är exakt 0/90/180/270° (±2°), visa:
  - Blå streckad linje istället för standardfärg
  - Liten "90°"-label vid cursorn
  - Visuell indikator (liten cirkel/highlight)
- Fungerar **utan** Shift — visuell hint dyker upp automatiskt när du råkar vara nära 90°. Shift tvingar fortfarande snap.

## Fas 3: 3D-prestandamätning i Grafik & Miljö

**Problem:** Ingen överblick över hur tunga ens 3D-modeller är.

**Fix:**
- `GraphicsSettings.tsx`: Lägg till en ny sektion "Scenbelastning" som läser `modelCache`-statistik (redan exponerad i PerformanceHUD):
  - Total triangelräkning, antal modeller, texturer
  - Visuell progress-bar mot rekommenderade maxgränser:
    - RPi: 50k trianglar, Tablet: 150k, Desktop: 500k
  - Färgkodad indikator (grön/gul/röd) per enhetsklass
  - Tip-text om man är över gränsen

## Fas 4: Anpassningsbar 3D-vy storlek + grafikkonsistens i Dashboard

**Problem:** 3D-förhandsvisningen i Dashboard (Grafik & Miljö) har fast höjd (250px) och använder `DashboardPreview3D` (separat lättviktig canvas) som inte matchar huvudscenen.

**Fix:**
- `DashboardGrid.tsx` (GraphicsCategory): Ersätt `DashboardPreview3D` med den persistenta bakgrundsscenen synlig genom en transparent ruta. Lägg till en höjd-kontroll (slider: 150–500px) som sparas i profil.
- Alternativt: Gör höjden justerbar med en resize-handle nedtill.

## Fas 5: Flytta Startvy in i Standby-panelen + 3D-förhandsvisning

**Problem:** `CameraStartSettings` ligger som separat rad under Inställningar → Skärm. Standby-panelens "3D-vy (bakgrund)"-ruta visar bara text.

**Fix:**
- `DashboardGrid.tsx` (SettingsCategory): Ta bort `<CameraStartSettings />` som separat komponent.
- `StandbySettingsPanel` (i DashboardGrid.tsx):
  - Integrera startvyn (spara/rensa kameraposition) i samma panel.
  - Ersätt placeholder-rutan `"3D-vy (bakgrund)"` med `<DashboardPreview3D className="h-[200px]" />`.

## Fas 6: Bibliotek-import — fullständig felsökning

**Problem:** Import via Bibliotek lägger till i catalog men modellen syns inte i listan.

**Fix:**
- `BuildModeV2.tsx` (`handleBibImportConfirm`): Problemet är troligen att `setSourceFilter('user')` + `setFilterCategory(bibImportCat)` inte matchar det som filtreringslogiken letar efter. Granska hela filtreringskedjan:
  - Kontrollera att `sourceFilter === 'user'` matchas korrekt mot `item.source === 'user'`
  - Kontrollera att `filterCategory` matchar `item.category` (case-sensitiv jämförelse)
  - Lägg till forced re-render efter state-uppdatering
  - Om det fortfarande inte funkar: logga catalog-längd före/efter och bekräfta att item faktiskt finns

## Fas 7: Robot-mappning med synkat rumsystem

**Problem:** Max 3 manuellt ritade zoner. Befintliga rum redan definierade.

**Fix:**
- `VacuumMappingTools.tsx`:
  - Ta bort den manuella "Rita robotzon"-begränsningen
  - Lägg till en sektion "Använda befintliga rum" som listar alla `rooms` från aktuellt våningsplan
  - Varje rum får en checkbox "Inkludera i robotstädning" + segment-ID-fält
  - Rummen konverteras automatiskt till vacuum-zoner baserat på sin polygon
  - Behåll manuell ritning som alternativ för specialområden

## Fas 8: Möbelinspektör — SliderWithInput + precision + gränser

**Problem:** Position/rotation/skala-sliders i PropInspector använder vanliga `Slider` utan möjlighet att skriva siffror. Step 0.1 skapar glapp (0.3→0.5). Max 20m är för mycket.

**Fix:**
- `BuildInspector.tsx` (PropInspector):
  - Ersätt alla `Slider` med `SliderWithInput` för position, rotation och skala
  - Position: max ändras från 20 → 10, step från 0.1 → 0.05
  - Rotation: behåll 0–360, step 1
  - Skala: step från 0.05 → 0.01
  - DeviceInspector: samma byte till `SliderWithInput` för position/rotation

## Fas 9: Halvera max zoom-ut

**Problem:** Vid max utzoom kan man inte se kameraposition och modellen blir för liten.

**Fix:**
- `PersistentScene3D.tsx`: Ändra `maxDistance` från `50` till `25` i alla OrbitControls (Home, Build).
- `DashboardPreview3D.tsx`: Ändra `maxDistance` från `40` till `20`.

## Fas 10: Versionsbump + changelog

- Bumpa till **v1.7.2** i `package.json`, `server/package.json`, `server/api/backups.js`, `bjorq_dashboard/config.yaml`, `bjorq_dashboard/README.md`.
- Uppdatera `CHANGELOG.md` med alla 8 fixar.

---

**Filer som ändras:** ~12 filer. Ingen ny fil behövs.

