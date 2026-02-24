

# Forbattrad hemskarm, widgets och energi

## Oversikt

Sex huvudomraden att forbattra: (1) fixa klick-interaktion pa enhets-widgets i hemskarm, (2) andrad logik for "dolj markeringar" sa ljuseffekter finns kvar men bollarna forsvinner, (3) flytta dolj-knappen sa den inte doljs bakom kamera-knappen, (4) forbattrad kamera-widget med kamera-vy, (5) widget-anpassning per enhet, och (6) energi-tracking per enhet med vecko/manadsstatistik.

---

## 1. Fixa klick pa enhets-widgets i hemskarm

Problemet: Enhets-widgetarna i HomeView har redan `onClick` som anropar `toggleDeviceState`, men den kompakta vyn (`CompactDeviceView`) visar bara status utan interaktivitet.

**`src/components/home/HomeView.tsx`**:
- Bekrafta att `onClick` pa enhets-widget-diven (rad 65) fungerar korrekt
- Lagga till visuell feedback (ripple-effekt eller puls) vid klick
- For icke-togglebara enheter (sensor, door-lock): oppna en expanderad vy istallet

**`src/components/home/cards/DeviceControlCard.tsx`**:
- Uppdatera `CompactDeviceView` att visa mer relevant info per enhetstyp:
  - **Kamera**: Visa kamera-ikon med Live-badge
  - **Lampa**: Visa ljusstyrka-procent
  - **Klimat**: Visa maltemperatur
  - **Media**: Visa titel/status
  - **Sensor**: Visa varde + enhet

---

## 2. Dolj markeringar = dolj bollar, behall ljuseffekter

Nuvarande beteende: `showDeviceMarkers === false` returnerar `null` fran hela `DeviceMarkers3D`, vilket tar bort allt inklusive ljus.

**`src/components/devices/DeviceMarkers3D.tsx`**:
- Nar `showDeviceMarkers === false` och `buildMode === false`:
  - **Behall** `<pointLight>` fran LightMarker (lampor ska fortfarande lysa)
  - **Dolj** visuella mesh-objekt (sfarer, ringar, etc.) genom att satta `visible={false}` pa mesh-noder
  - Skapa ett nytt "light-only" rendering-lage for varje marker-typ
- Specifik implementation:
  - `LightMarker`: Rendera bara `<pointLight>` utan mesh nar dolj ar aktivt
  - Alla andra markeringar: returnera null nar dolj ar aktivt
  - Eventuellt behall en osynlig klickbar mesh (transparent, opacity=0) om vi vill att klick i 3D ska fungera

---

## 3. Flytta dolj-knappen

**`src/components/home/HomeView.tsx`**:
- Flytta "dolj enheter"-knappen fran `bottom-24 right-4` (overlappar med CameraFab som ar `bottom-20 right-4`)
- Ny position: `bottom-36 right-4` (ovanfor kameraknappen)
- Alternativt: placera den till vanster om kameraknappen, eller i ovre hogra hornet

---

## 4. Forbattrad kamera-widget

**`src/components/home/cards/DeviceControlCard.tsx`**:
- Uppdatera `CompactDeviceView` for kameror:
  - Visa en mini-kamera-forhandsvisning (gradient-bakgrund med kamera-ikon + LIVE-badge)
  - Storre widget-storlek for kameror (aspect-video)
- Uppdatera `CameraControl` (full vy):
  - Behall kamera-preview med gradient-bakgrund och LIVE-badge (redan implementerat)
  - Lagg till knapp for fullskarmslage (placeholder for framtida RTSP/HLS)
  - Visa senaste snapshot-tid om tillganglig

**`src/components/home/HomeView.tsx`**:
- For kamera-widgets i hemskarm: anvand en storre widget-storlek
- Visa kamera-forhandsvisning direkt i widgeten (mini aspect-video vy)

---

## 5. Widget-anpassning per enhet

**`src/store/types.ts`**:
- Lagg till `widgetConfig` pa `DeviceMarker`:
```typescript
widgetConfig?: {
  showImage?: boolean;      // visa kamera/bild
  showToggle?: boolean;     // visa av/pa-knapp
  showValue?: boolean;      // visa varde (temp, ljusstyrka)
  showLabel?: boolean;      // visa namn
  size?: 'small' | 'medium' | 'large';
  customLabel?: string;     // anpassad text
};
```

**`src/components/home/cards/HomeWidgetConfig.tsx`**:
- Nar en enhet ar vald for hemskarm, visa konfigurationsalternativ:
  - Storlek (liten/medium/stor)
  - Vilka delar som ska synas (bild, knapp, varde, namn)
  - Anpassad text
- Anvand ett expanderbart avsnitt per enhet i listan

**`src/components/home/cards/DeviceControlCard.tsx`**:
- Las `widgetConfig` fran marker och respektera installningarna i bade kompakt och full vy

---

## 6. Energi per enhet + statistik

**`src/store/types.ts`**:
- Lagg till `energyTracking` pa `DeviceMarker`:
```typescript
energyTracking?: {
  enabled: boolean;
  currentWatts?: number;
  dailyKwh?: number;
  weeklyKwh?: number;
  monthlyKwh?: number;
};
```

**`src/components/home/DashboardGrid.tsx`** (EnergyCategory):
- Visa lista over enheter som har `energyTracking.enabled === true`
- Visa per enhet: namn, aktuell forbrukning (W), daglig/veckovis/manatlig forbrukning (kWh)
- Lagg till en sammanfattningssektion med total forbrukning och vilken enhet som dragit mest
- Visa ett enkelt stapeldiagram (med Recharts) for vecko-/manadsforbrukning
- Lagg till en toggle per enhet i enhetslistan for att aktivera energi-tracking

**`src/components/home/cards/DevicesSection.tsx`** eller nytt **`src/components/home/cards/EnergyDeviceList.tsx`**:
- Visa enheter med energi-tracking i en sorterad lista
- Visa forbrukningsbar (procentuell jamforelse med andra enheter)

**`src/components/home/cards/HomeWidgetConfig.tsx`**:
- Lagg till toggle "Visa energi" per enhet som satter `energyTracking.enabled`

---

## Teknisk sammanfattning

| Fil | Andring |
|-----|---------|
| `src/store/types.ts` | `widgetConfig` och `energyTracking` pa DeviceMarker |
| `src/store/useAppStore.ts` | Default-varden for nya falt, updateDevice hantering |
| `src/components/devices/DeviceMarkers3D.tsx` | Dolj bollar men behall ljus nar `showDeviceMarkers=false` |
| `src/components/home/HomeView.tsx` | Flytta dolj-knapp, storre kamera-widgets, klick-feedback |
| `src/components/home/cards/DeviceControlCard.tsx` | Forbattrad CompactView per typ, kamera-preview, respektera widgetConfig |
| `src/components/home/cards/HomeWidgetConfig.tsx` | Widget-anpassning per enhet, energi-toggle |
| `src/components/home/DashboardGrid.tsx` | Utokad EnergyCategory med enhetslista och statistik |
| `src/components/home/cards/EnergyDeviceList.tsx` | **NY** -- energi-enhetslista med forbrukningsjamforelse |

