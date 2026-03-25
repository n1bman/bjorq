

# BJORQ Nordic Noir — Implementeringsrunda 2: Upplevelsefokus

## Sammanfattning

Koden har strukturen men upplevelsen matchar inte planen. Denna runda fokuserar på att **synliggöra** systemen som redan finns i kod men inte känns i UI:t, samt stärka de moduler som fortfarande är för tunna.

---

## Fas 1: Kontrollpanelen — Synlig widgetfrihet

**Problem:** Dashboard ser ut som kategorikort i en grid. Widgetstorlekarna S/M/L/Hero finns i typer men syns aldrig. Edit-mode och density finns i store men exponeras inte i UI.

**Ändringar:**

### 1a. Dashboard toolbar med edit-mode + density (`DashboardGrid.tsx` HomeCategory)
- Lägg till en tydlig "Anpassa"-knapp som aktiverar `dashboard.editMode` via store
- I edit-mode: varje widget får en **storleksväljare-bar** (S/M/L/Hero knappar) ovanför sig
- Density-växlare (3 knappar: Lugn/Balans/Tät) visas i toolbaren — ändrar grid gap och padding live
- "Klar"-knapp sparar och stänger edit-mode

### 1b. WidgetCard wrapping (`DashboardGrid.tsx`)
- Wrappa ALLA kategorikort och widgetar i `WidgetCard` med rätt `size`-prop
- Hero = `col-span-full min-h-[360px]` — t.ex. 3D-preview eller energi-hero
- L = `lg:col-span-2 min-h-[280px]`
- Storleksändring i edit-mode sparar till `categoryLayouts`

### 1c. SortableWidgetGrid — stödja mixed sizes
- Uppdatera grid-klasser baserat på density:
  - Lugn: `gap-5`, M min-h ökar
  - Balans: `gap-3` (nuvarande)
  - Tät: `gap-2`, mindre padding i WidgetCard

### 1d. Visuell feedback i edit-mode
- Wobble-animation redan finns — bra
- Lägg till storleks-label (S/M/L/Hero) som liten badge på varje widget
- Drop-zone glow vid drag

**Filer:** `DashboardGrid.tsx`, `SortableWidgetGrid.tsx`, `WidgetCard.tsx`, `useAppStore.ts` (exponera `toggleDashboardEditMode`, `setDashboardDensity`)

---

## Fas 2: Hem-vyn — Layoutläge som verkligen syns

**Problem:** HomeLayoutEditor finns men användaren ser inte tydligt hur man når det eller vad man kan göra. Layout-knappen är väldigt diskret.

**Ändringar:**

### 2a. Tydligare ingång till layoutläge
- Flytta layout-knappen: istället för mitt-top, lägg den i en mer synlig position (t.ex. bredvid CameraFab eller som en subtil floating-knapp i hörnet)
- Ge den en tydligare ikon + kort label "Anpassa Hem"

### 2b. HomeLayoutEditor — mer interaktivt
- I layoutläge: varje widget ska ha **synliga kontroller direkt på widgeten**:
  - Storleksväxlare (compact/normal/expanded) som 3 små knappar
  - Positions-pilar eller drag-handle
- Visa halvtransparenta "drop-zoner" för alla 5 positioner med labels
- Lägg till en **förhandsgranskning** av vald storlek (widgeten ändrar sig live)

### 2c. Widget-storlekar som faktiskt syns
- `compact` → radikalt enklare (bara ett värde, t.ex. "18:42" utan ram)
- `normal` → nuvarande
- `expanded` → större med mer data
- Se till att skillnaden är **visuellt tydlig** — inte bara mer text utan annorlunda layout

**Filer:** `HomeView.tsx`, `HomeLayoutEditor.tsx`, `ClockWidget.tsx`, `WeatherWidget.tsx`, `TemperatureWidget.tsx`, `EnergyWidget.tsx`

---

## Fas 3: Energi — Levande datakänsla

**Problem:** Sparkline och ring finns men känns statiska. Saknar animation och levande känsla.

**Ändringar:**

### 3a. EnergySparkline — animerad draw
- Lägg till CSS `@keyframes sparkline-draw` i `index.css` (stroke-dashoffset 0→full)
- Sparkline ska "ritas" från vänster till höger vid mount
- Pulsande glow på current-time-indicator

### 3b. Hero-ring — pulsande animation
- Ringen ska animeras in (strokeDasharray transition)
- Lägg till en svag puls-animation på center-värdet (watt-siffran)

### 3c. Enhetsranking — mer liv
- Progressbar ska animeras in (width transition)
- LIVE-badge pulserar
- Hover/tap på enhet visar mer detalj (daily kWh breakdown)

### 3d. Peak-markeringar i sparkline
- Peaks ska ha tooltip vid hover (visar tid + watt)
- Röd/amber färg på peaks som överstiger dagsmål-linjens motsvarighet

**Filer:** `EnergySparkline.tsx`, `EnergyDeviceList.tsx`, `index.css`

---

## Fas 4: Klimat — Produktnyttigt beslutsstöd

**Problem:** ClimateRoomComparison och ClimateTrendLine finns men klimatvyn känns fortfarande tunn. Tomma tillstånd dominerar.

**Ändringar:**

### 4a. Bättre empty states
- Istället för "Inga klimatenheter placerade" → visa en illustrativ placeholder med instruktioner
- Lägg till demo-data-fallback: om inga enheter finns, visa exempeldata med "(Demo)" label

### 4b. ClimateTab — starkare nuvärde vs mål
- Flytta upp nuvärde/mål-displayen (idag gömd i entity-listan)
- Skapa en tydlig "hero-sektion" i toppen av klimat:
  - Snitt-temperatur i hemmet (stort tal, Space Grotesk 36px)
  - Antal rum inom/utanför mål
  - Enkel status: "Alla rum inom mål" eller "2 rum avviker"

### 4c. ClimateTrendLine — interaktivare
- Visa tooltip vid hover med exakt temperatur + tid
- Markera måltemperaturen tydligare (heldragen linje i stället för dashed)

### 4d. Regelstatus — mer tydlighet
- RuleCard: visa `lastTriggered` som "Senast aktiv: 14:32" under regelnamnet
- Visa aktuellt sensorvärde live bredvid tröskelvärdet

**Filer:** `ClimateTab.tsx`, `ClimateTrendLine.tsx`, `ClimateRoomComparison.tsx`

---

## Fas 5: Visuell nivå — Nordic Noir i hela produkten

**Problem:** Designen ser ut som en mörk dashboard med amber accent, inte som Nordic Noir premium.

**Ändringar:**

### 5a. DashboardShell — shell-känsla
- Nav-rail: djupare bakgrund, subtilare separatorer
- Summary-bar: ännu smalare, gradient-fade istället för solid border
- Content area: subtil vinjett-effekt (radial gradient overlay) för djupkänsla

### 5b. WidgetCard — rikare materialitet
- Alla `.nn-widget` → lägg till `inset shadow` för djup
- Subtil gradient-border (border-image med gradient) på hover
- Typography: alla värde-siffror → `font-display` (Space Grotesk), alla labels → uppercase tracking-wider

### 5c. Spacing och rytm
- Dashboard content: `gap-4` minimum (kontrollera att density "Lugn" ger `gap-5`)
- Sektionsrubriker: mer luft ovanför (`mt-6`) och tydligare separator

### 5d. 3D-preview i dashboard
- Ge 3D-preview-widgeten en subtil glow-border för att signalera att den är "levande"
- Mörkare overlay i hörnen (vinjett) för att skilja den från vanliga kort

**Filer:** `index.css`, `DashboardShell.tsx`, `DashboardGrid.tsx`, `WidgetCard.tsx`

---

## Implementeringsordning

| Fas | Fokus | Uppskattning |
|-----|-------|-------------|
| **1** | Kontrollpanel: synlig edit-mode, density, WidgetCard wrapping | Störst påverkan |
| **2** | Hem: tydligare layoutläge och storlekar | |
| **3** | Energi: animation och levande känsla | |
| **4** | Klimat: hero-sektion, demo-data, regelstatus | |
| **5** | Nordic Noir: shell, materialitet, spacing | Genomgående polish |

Alla faser görs i befintlig React/Tailwind/TS utan nya dependencies. Befintlig logik bevaras intakt — fokus är på att **synliggöra** och **förstärka** det som redan finns i kod.

