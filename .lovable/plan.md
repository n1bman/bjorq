

# Flytande kontrollpanel, sensorer, overvakning och profil

## Oversikt

Kontrollpanelen byggs om till en flytande grid-layout inspirerad av referensbilderna (Google Home / HA-dashboards). Kategorier visas som kompakta kort sida vid sida istallet for fulla rader. Dessutom laggs nya sensortyper, en overvakningsflik och en profilflik till.

---

## 1. Flytande grid-layout for Hem-vyn

### Problem
Idag tar varje kategori (Ljus, Sensorer, Klimat) hela sidans bredd i en enkel lista. Det ser stelt ut och slösar plats.

### Losning
Bygg om `HomeCategory` i `DashboardGrid.tsx` sa att varje enhetskategori renderas som ett kompakt **glasmorfism-kort** i en CSS grid (`grid-cols-2` pa mobil, `grid-cols-3` pa desktop). Kort med fa enheter tar 1 kolumn, kort med manga kan spanna 2.

**Fil: `src/components/home/DashboardGrid.tsx`** -- HomeCategory:
- Widgets (klocka, vader, energi) ligger kvar som en rad overst
- Under widgets: en `grid grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-auto` med ett kort per kategori
- Varje kategorikort visar:
  - Header med ikon + namn + antal pa/av
  - Toggle-all switch
  - Kompakt lista av enheter med snabb-switch och mini-slider
  - Om kortet ar expanderat: visar DeviceControlCard inline
- Kategorier utan enheter doljs automatiskt
- Kortstorleken anpassas -- en kategori med 1-2 enheter tar 1 kolumn, 5+ enheter tar `col-span-2`

**Ny komponent: `src/components/home/cards/CategoryCard.tsx`**:
- Glasmorfism-kort med header, toggle-all, och enhetslista
- Kollapsbar -- klick pa headern expanderar/kollapsar
- Kompakt enhetslista med emoji + namn + switch pa en rad
- Klick pa enskild enhet oppnar inline DeviceControlCard

### Paverkan pa DevicesSection
`DevicesSection` anvands fortfarande for "Enheter"-fliken (fullstandig vy med filter). `CategoryCard` ar en separat, mer kompakt komponent for Hem-vyns grid.

---

## 2. Nya sensortyper: temperatursensor och rorelsesensor

### Problem
Idag finns bara en generisk `sensor`-typ. Anvandaren vill ha separata sensorer for temperatur och rorelse.

### Andringar

**`src/store/types.ts`**:
- Utoka `SensorState` med ett `sensorType`-falt:
```typescript
export interface SensorState {
  value: number;
  unit: string;
  sensorType: 'temperature' | 'motion' | 'generic';
}
```

**`src/components/home/cards/DevicesSection.tsx`** och `DeviceControlCard.tsx`:
- Temperatursensor: visar stort temperaturvarde med termometer-ikon
- Rorelsesensor: visar "Rorelse detekterad" / "Lugnt" med tidsstampel for senaste rorelse
- Rorelsesensorn kan visuellt grupperas under "Sakerhet" (samma som kamera)

**`src/components/build/devices/DevicePlacementTools.tsx`**:
- Behall `place-sensor` men lagg till en submeny/dialog som fragar vilken sensortyp vid placering
- Alternativt: gor det konfigurerbart i inspektorn efter placering via ett dropdown

**`src/components/home/cards/CategoryCard.tsx`**:
- Rorelsesensor visar en liten ikon (oga/rorelse) istallet for termometer

---

## 3. Overvakningsflik med live-kameror

### Problem
Det saknas en dedikerad plats for att se kamerabilder.

### Andringar

**`src/components/home/DashboardGrid.tsx`**:
- Lagg till ny flik i menyn: `'surveillance'` med `Video`-ikon, label "Overvakning"
- Placera den mellan Energi och Aktivitet

**Ny komponent: `src/components/home/cards/SurveillancePanel.tsx`**:
- Visar ett grid med kamerakort (2 kolumner)
- Varje kamerakort visar:
  - Kameranamn
  - Placeholder-bild (morkt kort med kamera-ikon) -- riktig stream nar HA ar kopplad
  - Status: "Live" / "Offline"
  - Rorelsesensor-status om kopplad
- Kameror hamtas fran `devices.markers` med `kind === 'camera'`
- Tom-state: "Inga kameror placerade. Ga till Bygge for att lagga till."

---

## 4. Battre 3D-bakgrund i kontrollpanelen

### Problem
3D-scenen i bakgrunden ar svart att se forandringar igenom alla overlay-element.

### Andringar

**`src/components/home/DashboardView.tsx`**:
- Flytta 3D-scenen fran fullskarm bakgrund till en **avgransad vy** overst pa sidan
- Alternativ layout:
  - Overst: 3D-scen i en avgransad ruta (ca 30-40% av skarmhojden) med top-down kamera
  - Under: scrollbar dashboard-innehall
- 3D-rutan far lite border-radius och `overflow: hidden`
- Kameran satt till `topdown` preset i kontrollpanelen for battre oversikt
- Opacity okas fran 30% till 60-70% sa man ser andringar battre

---

## 5. Profilflik

### Problem
Det saknas mojlighet att andra tema, bakgrund eller andra personliga installningar.

### Andringar

**`src/store/types.ts`**:
```typescript
export interface UserProfile {
  name: string;
  theme: 'dark' | 'midnight' | 'light';
  accentColor: string;     // hex
  dashboardBg: 'scene3d' | 'gradient' | 'solid';
}
```
Lagg till `profile: UserProfile` i `AppState` och `setProfile`-action.

**`src/components/home/DashboardGrid.tsx`**:
- Bygg om "Installningar"-kategorin till tva delar: Installningar + Profil
- Eller lagg till en separat "Profil"-flik med `User`-ikon

**Ny komponent: `src/components/home/cards/ProfilePanel.tsx`**:
- Visa profilkort med:
  - Namn (textruta)
  - Tema-valjare: 3 knappar (Dark / Midnight / Light)
  - Accentfarg-valjare: fargade cirklar (guld, bla, gron, rod, lila)
  - Bakgrund: Scene3D / Gradient / Enfargad
- Andringar sparas direkt till store (localStorage)

---

## Teknisk sammanfattning

| Fil | Andring |
|-----|---------|
| `src/store/types.ts` | `SensorState.sensorType`, `UserProfile`, utokad `AppState` |
| `src/store/useAppStore.ts` | `profile` default, `setProfile` action, store version bump |
| `src/components/home/DashboardGrid.tsx` | Ny overvakning-flik, profil-flik, ombyggd HomeCategory till grid |
| `src/components/home/cards/CategoryCard.tsx` | **NY** -- kompakt kategorikort for grid-layout |
| `src/components/home/cards/SurveillancePanel.tsx` | **NY** -- kameraovervakning |
| `src/components/home/cards/ProfilePanel.tsx` | **NY** -- profil och tema |
| `src/components/home/cards/DeviceControlCard.tsx` | Uppdatera SensorControl for temp/rorelse |
| `src/components/home/DashboardView.tsx` | 3D-vy som avgransad ruta istallet for fullskarm bakgrund |
| `src/components/home/cards/DevicesSection.tsx` | `kindInfo` uppdaterad for sensortyper |

