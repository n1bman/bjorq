
# Drag-and-drop kategorier, veckovaeder och kalender

## Oversikt

Tre stora tillagg: (1) ett telefon-inspirerat drag-and-drop-system for att flytta enheter mellan kategorier och omordna kategorier, (2) en vecko-vaderprognos som synkas med din plats, och (3) en kalender-widget.

---

## 1. Drag-and-drop for enheter och kategorier

### Hur det fungerar
- **Lang-tryck (600ms)** pa en enhet i CategoryCard aktiverar "redigera-lage"
- Enheten far en visuell "lyft"-effekt (skala upp, skugga, halvtransparent)
- Alla kategorier visar en "slapp har"-zon (blinkande kantlinje)
- Slapp enheten pa en annan kategori = `moveDeviceToCategory()`
- Klick pa bakgrunden avbryter
- Samma princip for att flytta enheter inom en kategori (omordning)

### Kategori-omordning
- Lang-tryck pa en kategori-header aktiverar kategori-drag
- Kategorier kan dras och omordnas i gridet
- Ny store-action: `reorderCategories(fromIndex, toIndex)`

### Teknisk approach
Anvander **HTML Drag and Drop API** (inbyggt, inget extra bibliotek):
- `draggable` attribut satt vid lang-tryck
- `onDragStart`, `onDragOver`, `onDrop` handlers
- CSS-klasser for visuell feedback
- Touch-stod via `onTouchStart` + timer for lang-tryck, sedan fallback till klick-baserad flytt pa mobil

### Filandringar

**`src/store/types.ts`**:
- Lagg till `reorderCategories: (fromIndex: number, toIndex: number) => void` i AppState

**`src/store/useAppStore.ts`**:
- Implementera `reorderCategories` action som flyttar en kategori i arrayen

**`src/components/home/cards/CategoryCard.tsx`**:
- Acceptera nya props: `onDragDevice`, `onDropDevice`, `editMode`, `onDragCategory`, `onDropCategory`
- Enheter far `draggable` + visuell feedback i edit-lage
- Kategorikort far `onDragOver` + `onDrop` som drop-zon
- Lang-tryck-handler pa enheter (600ms timer)

**`src/components/home/DashboardGrid.tsx` (HomeCategory)**:
- Haller "editMode"-state och "draggingDeviceId"-state
- Skickar drag-handlers till alla CategoryCard-instanser
- Visar en "Redigera"-knapp som manuellt aktiverar edit-lage (alternativ till lang-tryck)
- Kategorier far drag-handlers for omordning
- Visar instruktionstext nar edit-lage ar aktivt: "Dra enheter mellan kategorier"

---

## 2. Vecko-vaderprognos

### Hur det fungerar
- Utoka Open-Meteo-anropet att hamta 7-dagars prognos
- Visa en snygg rad med veckodagar, var med ikon + max/min-temp

### Filandringar

**`src/hooks/useWeatherSync.ts`**:
- Utoka `fetchWeather()` att aven hamta `daily` data fran Open-Meteo:
```
&daily=weathercode,temperature_2m_max,temperature_2m_min&forecast_days=7
```
- Returnera `forecast: { day: string; condition: WeatherCondition; maxTemp: number; minTemp: number }[]`

**`src/store/types.ts`**:
- Lagg till i EnvironmentState:
```typescript
forecast?: { day: string; condition: WeatherCondition; maxTemp: number; minTemp: number }[];
```
- Utoka `setWeatherData` att acceptera forecast

**`src/store/useAppStore.ts`**:
- Spara forecast i environment state

**`src/components/home/cards/WeatherWidget.tsx`**:
- Under nuvarande vader: visa en kompakt rad med 7 dagar
- Varje dag visar: kortnamn (Mån, Tis...), vader-ikon, max/min-temp
- Horisontell scroll pa mobil
- Stilren glasmorfism-design

---

## 3. Kalender-widget

### Hur det fungerar
- Enkel kalender-widget som visar manadsvy
- Framtida koppling till e-postkalender (Google Calendar API) -- forbereds med placeholder
- Visar dagens datum markerat och kommande handelser

### Filandringar

**`src/components/home/cards/CalendarWidget.tsx`** (NY):
- Visar en kompakt manadskalender med shadcn Calendar-komponent
- Under kalendern: lista med kommande handelser (placeholder-data forst)
- Knapp "Koppla kalender" som forbereder for Google Calendar-integration
- Design: glasmorfism-kort, kompakt storlek

**`src/components/home/DashboardGrid.tsx`**:
- Lagg till `CalendarWidget` i Hem-vyns widget-rad (bredvid klocka, vader, energi)
- Alternativt: ny flik "Kalender" med `CalendarDays`-ikon

**`src/store/types.ts`**:
- Lagg till `calendar` i VisibleWidgets: `calendar: boolean`

---

## Teknisk sammanfattning

| Fil | Andring |
|-----|---------|
| `src/store/types.ts` | `reorderCategories`, `forecast` i EnvironmentState, `calendar` i VisibleWidgets |
| `src/store/useAppStore.ts` | `reorderCategories` action, spara forecast |
| `src/hooks/useWeatherSync.ts` | Hamta 7-dagars prognos fran Open-Meteo |
| `src/components/home/cards/CategoryCard.tsx` | Drag-and-drop stod med lang-tryck |
| `src/components/home/DashboardGrid.tsx` | Edit-lage, drag-state, CalendarWidget, redigera-knapp |
| `src/components/home/cards/WeatherWidget.tsx` | Vecko-prognos-rad |
| `src/components/home/cards/CalendarWidget.tsx` | **NY** -- kalender-widget |
