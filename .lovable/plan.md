

# Omstrukturering av flikar, widgets och enhetsinteraktion

## 1. Ny flikstruktur i kontrollpanelen

Nuvarande flikar: Hem, Vader, Enheter, Energi, Overvakning, Aktivitet, Installningar, HA, Profil

Ny ordning:

| Flik | Ikon | Innehall |
|------|------|----------|
| Hem | Home | Kategorier, enhetsgrupper (som idag) |
| Vader | Cloud | Veckovaeder, platsinstallningar |
| Kalender | CalendarDays | Kalender-widget (flyttas fran Hem) |
| Enheter | Cpu | Enhetsfilter + lista |
| Energi | Zap | Energi-widget |
| Overvakning | Video | Kameror |
| Aktivitet | Bell | Logg |
| Profil | User | Profil + Installningar + HA (sammanslagen) |
| Widgets | LayoutGrid | Widget-konfiguration for hemskarm |

Totalt: 9 flikar (bort: separata Installningar och Profil, in: Kalender och Widgets)

**`src/components/home/DashboardGrid.tsx`**: Uppdatera `DashCategory`-typ och `categories`-array. Sla ihop `SettingsCategory` och `ProfilePanel` till en ny `ProfileSettingsCategory` som visar profil, plats, tema och HA-anslutning i samma vy. Flytta `HomeWidgetConfig` till en egen `WidgetsCategory`-komponent.

---

## 2. Adress-baserad plats under Vader

**`src/components/home/cards/LocationSettings.tsx`**:
- Lagg till tva textfalt: "Adress / Stad" och "Land"
- En "Sok plats"-knapp som anvandar Open-Meteo Geocoding API (`https://geocoding-api.open-meteo.com/v1/search?name={query}&count=1`) for att konvertera adress till koordinater
- Behall befintlig "Anvand min plats"-knapp och manuella lat/lon-falt som fallback
- Visa den hittade platsen som bekraftelse

---

## 3. Standardiserade widgets med expanderbar detalj

Alla widgets (Clock, Weather, Energy, Temperature, enhets-widgets) far ett standardiserat utseende:
- **Kompakt lage** (default): fast storlek ca 160x90px, visar nyckelvardet
- **Expanderat lage**: klick pa widgeten expanderar den till en storre detaljvy med mer info

**Beror filer**:
- `ClockWidget.tsx` -- klick visar datum, veckodag, tidszon
- `WeatherWidget.tsx` -- klick expanderar till full veckoprognos
- `EnergyWidget.tsx` -- klick visar detaljer
- `TemperatureWidget.tsx` -- klick visar alla klimat-enheter
- `DeviceControlCard.tsx` -- anvands i hemskarm-widgets, klick expanderar kontroller

**Implementation**: Varje widget far en `expanded` boolean state. I kompakt lage visas en rad med ikon + varde. Klick togglear `expanded` och visar fullstandigt innehall.

---

## 4. Kamera-widget

**`src/components/home/cards/DeviceControlCard.tsx`**:
- Lagg till en `CameraControl`-komponent for `kind === 'camera'`
- Kompakt: visar en placeholder-bild (gradient eller kamera-ikon) med "Live"-badge
- Expanderat: visar storre vy med placeholder for videoflode
- Forberedd for framtida integration med riktig RTSP/HLS-stream via HA

**`src/store/types.ts`**:
- Lagg till `CameraState` typ: `{ on: boolean; streaming: boolean; lastSnapshot?: string }`
- Lagg till i `DeviceState` union

---

## 5. Ett-klick av/pa for enheter pa hemskarm

**`src/components/home/HomeView.tsx`**:
- For enheter med pa/av-funktion (light, switch, climate, vacuum, media_screen, generic, power-outlet): klick pa widgeten togglear `on`-state direkt via `toggleDeviceState`
- Langa trycket (eller dubbel-klick) oppnar expanderad kontroll
- Visuell feedback: av = daempad/grayscale widget, pa = normal/ljus

**Beror aven**: `DeviceControlCard.tsx` -- lagg till en `compact`-prop som bara visar ikon + namn + on/off-status utan alla kontroller.

---

## 6. Dolj/visa enhetsmarkeringar i 3D-vyn

**`src/store/types.ts`**:
- Lagg till `showDeviceMarkers: boolean` i `HomeViewState` (default: true)

**`src/components/home/HomeView.tsx`**:
- Lagg till en liten flytande knapp (t.ex. Eye/EyeOff-ikon) bredvid CameraFab
- Klick togglear `showDeviceMarkers`
- Nar `false`: enhetsmarkorer i 3D-scenen doljs, men enhets-widgetarna (valda enheter langst ned) forblir synliga och klickbara

**`src/components/devices/DeviceMarkers3D.tsx`**:
- Las `showDeviceMarkers` fran store
- Returnera null om `false` (eller saett `visible={false}`)

---

## Teknisk sammanfattning

| Fil | Andring |
|-----|---------|
| `src/components/home/DashboardGrid.tsx` | Ny flikstruktur: Kalender + Widgets som egna flikar, Profil+Installningar+HA ihop |
| `src/components/home/cards/LocationSettings.tsx` | Adress/stad/land-falt + geocoding-API-anrop |
| `src/components/home/cards/ClockWidget.tsx` | Kompakt/expanderad toggle |
| `src/components/home/cards/WeatherWidget.tsx` | Kompakt/expanderad toggle |
| `src/components/home/cards/EnergyWidget.tsx` | Kompakt/expanderad toggle |
| `src/components/home/cards/TemperatureWidget.tsx` | Kompakt/expanderad toggle |
| `src/components/home/cards/DeviceControlCard.tsx` | CameraControl, compact-prop, ett-klick toggle |
| `src/store/types.ts` | CameraState, showDeviceMarkers i HomeViewState |
| `src/store/useAppStore.ts` | toggleShowDeviceMarkers, CameraState default |
| `src/components/home/HomeView.tsx` | Dolj-knapp, ett-klick toggle pa enhets-widgets |
| `src/components/devices/DeviceMarkers3D.tsx` | Respektera showDeviceMarkers |

