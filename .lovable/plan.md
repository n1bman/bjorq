

# Vader-synk, temperatur-uppdelning och modernt kategori-system

## Problem att losa

1. **Vaderdata stammer inte** -- Environment source ar satt till `'manual'` som standard, sa live-vader fran Open-Meteo aktiveras aldrig. Koordinaterna (59.33, 18.07 = Stockholm) kan dessutom behova justeras till din faktiska plats.
2. **Tva identiska temperatur-widgets** -- Bade WeatherWidget och TemperatureWidget visar samma `environment.weather.temperature` (utomhus). Den ena borde visa inomhustemperatur fran klimatsensorer.
3. **Menyn (Hem/Kontrollpanel/Bygge) tackes av kategori-kort** -- HomeNav ligger `fixed bottom-6 z-50` men dashboard-innehallet scrollar under den utan tillracklig padding.
4. **Kategori-systemet ar for statiskt** -- Anvandaren vill kunna skapa egna kategorier, flytta enheter mellan dem, och valja vilka enheter som visas som widgets pa hemskermen.

---

## 1. Fixa vader-synk

**`src/store/useAppStore.ts`**:
- Andra default `environment.source` fran `'manual'` till `'auto'` sa att live-vader aktiveras direkt
- Alternativt: lagg till en tydlig "Aktivera live vader"-knapp i LocationSettings

**`src/components/home/cards/LocationSettings.tsx`**:
- Lagg till en switch for att valja mellan `manual` och `auto` vader-kalla
- Lagg till en "Anvand min plats"-knapp som anropar `navigator.geolocation` for att hamta korrekta koordinater automatiskt
- Visa aktuell vader-status (senast uppdaterad, kalla) under koordinaterna

**`src/hooks/useWeatherSync.ts`**:
- Inga stora forandringar behovs -- hooken fungerar korrekt, den aktiveras bara inte eftersom source ar `'manual'`

---

## 2. Separera utomhus- och inomhustemperatur

**`src/components/home/cards/TemperatureWidget.tsx`**:
- Andra fran att visa `environment.weather.temperature` till att visa **genomsnittlig inomhustemperatur** fran klimat-enheter
- Las alla `deviceStates` dar `kind === 'climate'` och berakna medelvarde av `currentTemp`
- Visa "Inomhus" som etikett istallet for "Utomhus"
- Om inga klimat-enheter finns: visa "--°C" med en liten text "Lagg till klimatenhet"

**`src/components/home/cards/WeatherWidget.tsx`**:
- Behalls som den ar -- den visar utomhustemperatur korrekt
- Lagg till etiketten "Utomhus" for tydlighet

---

## 3. Fixa nav-overlap

**`src/components/home/DashboardGrid.tsx`**:
- Lagg till `pb-24` (eller `pb-28`) pa den scrollbara content-containern sa att innehallet aldrig doljs bakom HomeNav-pillen

---

## 4. Modernt kategori-system med drag-and-drop

### 4a. Store-andringar

**`src/store/types.ts`**:
```text
// Ny typ for anpassade kategorier
interface DeviceCategory {
  id: string;
  name: string;
  icon: string;        // emoji
  deviceIds: string[]; // ordnade enhets-ID:n
  color?: string;      // accent-farg for kategorin
}

// Lagg till i AppState:
customCategories: DeviceCategory[];
addCategory: (name: string, icon: string) => void;
removeCategory: (id: string) => void;
renameCategory: (id: string, name: string) => void;
moveDeviceToCategory: (deviceId: string, categoryId: string) => void;
reorderDeviceInCategory: (categoryId: string, deviceId: string, newIndex: number) => void;
```

**`src/store/useAppStore.ts`**:
- Implementera CRUD-actions for `customCategories`
- Nar en enhet placeras (`addDevice`), tilldela den automatiskt en default-kategori baserat pa `kindCategory`-tabellen
- Tillat att enheter ligger i max en kategori at gangen

### 4b. Hem-vy med flytande kategorier

**`src/components/home/DashboardGrid.tsx`** -- HomeCategory:
- Anvand `customCategories` fran store istallet for att berakna kategorier fran `kindCategory`
- Om inga anpassade kategorier finns, fall tillbaka pa auto-gruppering (som idag)
- Lagg till en "Hantera kategorier"-knapp som oppnar en modal/panel

### 4c. Kategori-hantering

**Ny komponent: `src/components/home/cards/CategoryManager.tsx`**:
- Visa alla kategorier i en lista
- "Skapa ny kategori" med namn + emoji-valjare
- Klick pa en kategori visar dess enheter
- Drag-and-drop for att flytta enheter mellan kategorier (enkelt: klick + "Flytta till..."-meny som forsta steg, drag-and-drop som framtida forstorkning)
- Ta bort kategori (enheter flyttas tillbaka till "Okategoriserade")
- Byt namn och ikon pa befintlig kategori

---

## 5. Widget-valjare for hemskermen

**`src/store/types.ts`**:
- Utoka `VisibleWidgets` eller lagg till `homeScreenDevices: string[]` i `HomeViewState` for att spara vilka enskilda enheter som ska visas som flytande widgets pa Hem-skermen (3D-vyn)

**`src/components/home/cards/HomeWidgetConfig.tsx`**:
- Behall befintliga widget-toggles (klocka, vader, energi)
- Lagg till en sektion "Enhets-widgets" dar man kan bocka av enskilda enheter som ska visas pa Hem-skermen
- Visa en kompakt lista av alla enheter med checkboxar

**`src/components/home/HomeView.tsx`**:
- Rendera valda enheter som kompakta flytande kort (mini-DeviceControlCard) pa 3D-vyn
- Placera dem i en scrollbar rad langst ned, ovanfor HomeNav

---

## Teknisk sammanfattning

| Fil | Andring |
|-----|---------|
| `src/store/types.ts` | `DeviceCategory`, `customCategories`, nya actions, `homeScreenDevices` i HomeViewState |
| `src/store/useAppStore.ts` | Default source = `'auto'`, kategori-CRUD, homeScreenDevices |
| `src/components/home/cards/LocationSettings.tsx` | Auto/manual-switch, geolocation-knapp |
| `src/components/home/cards/TemperatureWidget.tsx` | Visa inomhustemperatur fran klimat-enheter |
| `src/components/home/cards/WeatherWidget.tsx` | Lagg till "Utomhus"-etikett |
| `src/components/home/DashboardGrid.tsx` | `pb-24` for nav-utrymme, anvand customCategories |
| `src/components/home/cards/CategoryManager.tsx` | **NY** -- skapa/redigera/flytta kategorier |
| `src/components/home/cards/HomeWidgetConfig.tsx` | Enhets-widget-valjare for hemskermen |
| `src/components/home/HomeView.tsx` | Rendera valda enhets-widgets pa 3D-vyn |

## Prioritetsordning

1. Vader-fix (source = auto + geolocation) -- snabb fix, stor effekt
2. Temperatur-uppdelning (inomhus vs utomhus)
3. Nav-overlap fix (pb-24)
4. Kategori-system med hantering
5. Widget-valjare for hemskermen
