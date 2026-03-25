

# BJORQ Nordic Noir — Fullständig implementeringsplan

## Analys av gap mellan plan och nuläge

Nuvarande implementation har grundstrukturen på plats men saknar djup i alla sex områden som användaren identifierat.

---

## 1. Hem-vyn — Konfigurerbart overlay-system

**Nuläge:** Widgets är hårdkodade till top-left/top-right. `HomeWidgetConfig` kan visa/dölja men saknar position/storlek/layoutläge.

**Ändringar:**

### 1a. Utöka `HomeViewState` i `types.ts`
Lägg till:
```typescript
interface WidgetOverlayConfig {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center-top';
  size: 'compact' | 'normal' | 'expanded';
}
homeWidgetLayout: Record<'clock' | 'weather' | 'temperature' | 'energy', WidgetOverlayConfig>;
homeLayoutEditMode: boolean;
```

### 1b. Ny komponent: `HomeLayoutEditor.tsx`
- Visas när `homeLayoutEditMode = true`
- Grid-guide overlay med halvtransparenta drop-zoner
- Varje widget visar drag-handle + storleksväljare (compact/normal/expanded)
- Knapp i HomeView (t.ex. kugghjul-ikon) för att aktivera/avsluta layoutläge
- Vid avslut: spara layout till store

### 1c. Uppdatera `HomeView.tsx`
- Läs `homeWidgetLayout` från store istället för hårdkodade positioner
- Varje overlay renderas i en `PositionedOverlay`-wrapper som placerar via absolute + Tailwind-klasser baserat på sparad position
- Widgets ska stödja `size`-prop: compact (bara värde), normal (nuvarande), expanded (mer detalj)

### 1d. Uppdatera `ClockWidget`, `WeatherWidget`, `TemperatureWidget`, `EnergyWidget`
- Lägg till `size?: 'compact' | 'normal' | 'expanded'` prop
- `compact`: bara t.ex. "18:42" / "7°" / "342W"
- `expanded`: mer info — datum+vecka, vind+fukt, dagskostnad

### 1e. Uppdatera `HomeWidgetConfig.tsx`
- Lägg till position-väljare (5 positioner) och storleksväljare per widget

**Filer:** `types.ts`, `useAppStore.ts`, `HomeView.tsx`, `HomeWidgetConfig.tsx`, ny `HomeLayoutEditor.tsx`, `ClockWidget.tsx`, `WeatherWidget.tsx`, `TemperatureWidget.tsx`, `EnergyWidget.tsx`

---

## 2. Kontrollpanelen — Fri widgetyta

**Nuläge:** `SortableWidgetGrid` stödjer bara `colSpan: 1 | 2`. Inga explicita storlekar S/M/L/Hero. Ingen density. Ingen breakpoint-layout.

**Ändringar:**

### 2a. Utöka `WidgetPlacement` i `types.ts`
```typescript
interface WidgetPlacement {
  widgetId: string;
  order: number;
  colSpan?: 1 | 2;
  size?: 'S' | 'M' | 'L' | 'Hero';
}
interface DashboardSettings {
  activeCategory: DashCategory;
  categoryLayouts: Partial<Record<DashCategory, WidgetPlacement[]>>;
  density: 'calm' | 'balance' | 'dense';
}
```

### 2b. Ny komponent: `WidgetCard.tsx`
- Wrapper med Nordic Noir styling baserat på `size`
- S: `min-h-[80px]`, 1 col
- M: `min-h-[180px]`, 1 col
- L: `min-h-[280px]`, 2 col
- Hero: `min-h-[360px]`, full bredd
- `.nn-widget` bakgrund, gradient, subtil amber border-hover

### 2c. Uppdatera `SortableWidgetGrid.tsx`
- Stödja 4 storlekar istället för bara colSpan
- Hero = full-bredd (col-span-all)
- Visuell feedback vid drag (ghost + drop-indikator)

### 2d. Dashboard edit-mode
- Knapp "Anpassa dashboard" i `DashboardGrid.tsx` HomeCategory
- I edit-mode: varje widget visar storleksväljare (S/M/L/Hero) + drag-handle
- Density-växlare (3 knappar: Lugn/Balans/Tät) som justerar grid gap och widget min-height

### 2e. Uppdatera `CategoryCard.tsx`
- Ta bort emoji-ikoner → Lucide-ikoner genomgående
- Stödja `size`-prop från WidgetCard

**Filer:** `types.ts`, `useAppStore.ts`, ny `WidgetCard.tsx`, `SortableWidgetGrid.tsx`, `DashboardGrid.tsx`, `CategoryCard.tsx`

---

## 3. Energi — Starkare live-datavisualisering

**Nuläge:** Hero-siffra finns men saknar sparkline, peak-markeringar och levande känsla.

**Ändringar:**

### 3a. Ny komponent: `EnergySparkline.tsx`
- Inline SVG sparkline baserad på simulerad/lagrad timdata
- Animerad linje (CSS stroke-dashoffset animation)
- Peak-markeringar som cirklar med tooltip

### 3b. Uppdatera `EnergyDeviceList.tsx`
- Integrera sparkline i hero-sektionen
- Lägg till cirkulär förbrukningsindikator (SVG ring) som visar andel av dagsmål
- Dagsmål = konfigurerbart i energyConfig (ny `dailyGoalKwh`-property)
- Enhetsranking: sortera med tydligare progressbar + animerad fill
- "LIVE"-pulsindikator vid ansluten HA

### 3c. Uppdatera `EnergyWidget.tsx` (overlay-mode)
- Compact-mode: bara watt + mini-sparkline (liten 60x20px SVG)

**Filer:** ny `EnergySparkline.tsx`, `EnergyDeviceList.tsx`, `EnergyWidget.tsx`, `types.ts` (EnergyConfig utökas)

---

## 4. Klimat — Tydligare beslutsstöd

**Nuläge:** ClimateOverview visar nuvärde+mål per enhet men saknar trend, rumsjämförelse och tydlig regelstatus.

**Ändringar:**

### 4a. Ny komponent: `ClimateRoomComparison.tsx`
- Alla rum med temperatur side-by-side som horisontella barer
- Avvikelse från mål markeras visuellt (röd om > +2°, blå om < -2°)

### 4b. Ny komponent: `ClimateTrendLine.tsx`
- 24h inline SVG kurva per rum/sensor
- Visar riktning (stiger/sjunker) med pil och textindikator

### 4c. Uppdatera `ClimateTab.tsx`
- Ny ordning: 1) Rumsjämförelse (alla rum i en blick), 2) Komfortstatus med trendlinjer, 3) Override, 4) Regler
- ComfortStatus: lägg till senaste åtgärd/triggertid per aktiv regel
- RuleCard: visa `lastTriggered`-timestamp och aktuellt sensorvärde

**Filer:** ny `ClimateRoomComparison.tsx`, ny `ClimateTrendLine.tsx`, `ClimateTab.tsx`

---

## 5. Väder — Egen identitet och produktnytta

**Nuläge:** `WeatherCategory` i DashboardGrid är bara `<WeatherWidget expanded />` + ett textblock.

**Ändringar:**

### 5a. Uppdatera `WeatherWidget.tsx` expanded-mode
- "Nu-panel": Större temperatur (48px), ikon + känsla ("Klart och kallt")
- Tidsgradient: bakgrunden subtilt ljusare/mörkare baserat på tid på dygnet
- 24h prognos-strip: horisontell scroll med timvisa ikoner (generera demo-data om forecast saknas)

### 5b. Ny komponent: `WeatherHomeImpact.tsx`
- "Påverkan på hemmet" — analyserar solvinkel + fönsterpositioner
- T.ex. "Sol från söder, sovrum uppvärms" eller "Regn förväntas kl 15"
- Läser `environment.sunAzimuth`, `environment.sunElevation` + rums-/fönsterdata

### 5c. Uppdatera `WeatherCategory` i `DashboardGrid.tsx`
- Ny layout: Nu-panel (hero) + 24h prognos + WeatherHomeImpact + SunWeatherPanel-länk

**Filer:** `WeatherWidget.tsx`, ny `WeatherHomeImpact.tsx`, `DashboardGrid.tsx`

---

## 6. Responsivitet

**Nuläge:** DashboardShell har mobil/tablet/desktop men widgets anpassas inte. Hem-vyn har ingen responsiv logik.

**Ändringar:**

### 6a. Uppdatera `HomeView.tsx`
- Mobil (<768px): overlays staplat vertikalt i top-center, device-pills i 2-kolumns grid
- Tablet: nuvarande layout men med större touch-targets

### 6b. Uppdatera `DashboardGrid.tsx`
- Mobil: alla widgets single-column, Hero = full-bredd
- Tablet: 2-kolumns grid
- Desktop: 3-kolumns grid (nuvarande 2 → 3)

### 6c. Uppdatera alla widget-komponenter
- Kontrollera att text inte trunkeras på mobil
- Touch-targets minimum 44px

**Filer:** `HomeView.tsx`, `DashboardGrid.tsx`, `SortableWidgetGrid.tsx`, diverse widget-filer

---

## Implementeringsordning

1. **Types + Store** — utöka `HomeViewState`, `WidgetPlacement`, `DashboardSettings`, `EnergyConfig`
2. **Hem overlay-system** — `HomeLayoutEditor`, positionerade widgets, storlekar
3. **Kontrollpanel widgetsystem** — `WidgetCard`, S/M/L/Hero, density, edit-mode
4. **Energi** — sparkline, cirkulär ring, peak, levande känsla
5. **Klimat** — rumsjämförelse, trendlinje, regelstatus
6. **Väder** — nu-panel, 24h strip, hemkoppling
7. **Responsivitet** — alla vyer anpassade för mobil/tablet/desktop

Alla ändringar görs i befintlig React/Tailwind/TS-kodbas utan nya dependencies. Inline SVG för sparklines/trender. Befintlig logik (store, hooks, HA, 3D) bevaras intakt.

