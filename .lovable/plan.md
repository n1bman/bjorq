

# Kategoriserade enheter, aktivitetsflode och ljus-synk i 3D

## Oversikt

Tre huvudomraden:
1. **Kategoriserat Hem-vy** -- Google Home-liknande gruppering med mojlighet att stanga av hela kategorier
2. **Aktivitetsflode** -- En ny flik i kontrollpanelen for notiser och handelser
3. **Ljus-synk i 3D** -- Lampor i 3D reagerar pa ljusstyrka, fargtemperatur och RGB fran kontrollpanelen

---

## 1. Kategoriserat Hem-vy (Google Home-stil)

### Problem
Idag visas enheter grupperade per rum/vaning. Anvandaren vill kunna:
- Gruppera per kategori (Ljus, Klimat, Media, etc.)
- Stanga av alla enheter i en kategori med ett klick
- Valja kategori for en enhet vid placering (t.ex. "Datorrum" eller "Lampor")

### Andringar

**`src/components/home/DashboardGrid.tsx`** -- HomeCategory:
- Lagg till kategori-flikar (Ljus, Klimat, Media, etc.) overst i Hem-vyn
- Varje kategori visar en header med namn, antal pa/av, och en "stang av alla"-knapp
- Klick pa kategorin expanderar/kollapsar den
- Behall rum-gruppering inuti varje kategori

**`src/components/home/cards/DevicesSection.tsx`**:
- Ny prop `groupBy: 'room' | 'category'` -- default `'category'` for Hem-vyn
- Nar `groupBy === 'category'`: gruppera enheter efter `kindInfo`-tabell
- Varje kategori-header far en "Toggle all"-switch som anropar `updateDeviceState` pa alla enheter i gruppen

**`src/store/types.ts`** -- DeviceMarker:
- Lagg till ett valfritt falt `userCategory?: string` pa `DeviceMarker`
- Anvandaren kan overskriva default-kategorin (t.ex. flytta en lampa till "Datorrum")

**`src/components/build/BuildInspector.tsx`**:
- Lagg till en dropdown for `userCategory` i enhetsinspektorn (vid placering eller redigering)
- Forval: enhetens `kind`-baserade kategori. Alternativ: alla befintliga rum + egendefinierade

---

## 2. Aktivitetsflode

### Problem
Det saknas en plats for notiser, handelser och varningar (dorroppning, tappad anslutning, HA-notiser).

### Andringar

**`src/store/types.ts`**:
```typescript
export interface ActivityEvent {
  id: string;
  timestamp: string;         // ISO
  deviceId?: string;
  kind: 'state_change' | 'alert' | 'connection' | 'notification';
  title: string;
  detail?: string;
  severity: 'info' | 'warning' | 'error';
  read: boolean;
}

// Lagg till i AppState:
activityLog: ActivityEvent[];
pushActivity: (event: Omit<ActivityEvent, 'id' | 'timestamp' | 'read'>) => void;
clearActivity: () => void;
markActivityRead: (id: string) => void;
```

**`src/store/useAppStore.ts`**:
- Implementera `activityLog` med max 100 poster (FIFO)
- `pushActivity` genererar id och timestamp automatiskt
- Nar `updateDeviceState` kallas, pusha automatiskt en `state_change`-event

**Ny fil: `src/components/home/cards/ActivityFeed.tsx`**:
- Visar en scrollbar lista med handelser, senaste overst
- Varje rad: ikon + tid + titel + detalj
- Fargkodad per severity (info=gra, warning=gul, error=rod)
- "Rensa alla"-knapp

**`src/components/home/DashboardGrid.tsx`**:
- Lagg till ny kategori-flik "Aktivitet" med `Bell`-ikon
- Visa ActivityFeed-komponenten
- Badge pa fliken med antal olasta handelser

**`src/store/types.ts`** -- DeviceMarker:
- Lagg till `notifyOnHomeScreen?: boolean` pa `DeviceMarker`
- Nar detta ar `true`, visas notiser fran denna enhet som overlay pa Hem-skarmen

**`src/components/build/BuildInspector.tsx`**:
- Lagg till en checkbox "Visa notiser pa Hem-skarmen" i enhetsinspektorn

---

## 3. Ljus-synk i 3D

### Problem
`LightMarker` laser bara `state.data.on` -- den ignorerar ljusstyrka, fargtemperatur och RGB helt.

### Andringar

**`src/components/devices/DeviceMarkers3D.tsx`** -- LightMarker:
- Las ut `brightness`, `colorTemp`, `rgbColor`, `colorMode` fran `state.data`
- Berakna lampans farg baserat pa `colorMode`:
  - `'temp'`: Konvertera mireds (153-500) till RGB via en enkel lookup/lerp (kall bla till varm orange)
  - `'rgb'`: Anvand `rgbColor` direkt
  - `'off'`: Dimmad gra
- Satt `pointLight.intensity` proportionellt mot `brightness / 255`
- Satt `meshStandardMaterial.emissiveIntensity` proportionellt mot ljusstyrka
- Satt `meshStandardMaterial.color` och `emissive` till den beraknade fargen
- Satt `pointLight.color` till samma farg

Ny hjalp-funktion:
```typescript
function miredsToHex(mireds: number): string {
  // 153 = kall (bluish white ~6500K)
  // 500 = varm (orange ~2000K)
  const t = (mireds - 153) / (500 - 153); // 0=kall, 1=varm
  const r = Math.round(255);
  const g = Math.round(255 - t * 100);
  const b = Math.round(255 - t * 200);
  return `rgb(${r},${g},${b})`;
}
```

---

## Teknisk sammanfattning

| Fil | Andring |
|-----|---------|
| `src/store/types.ts` | `userCategory` pa DeviceMarker, `ActivityEvent`, `activityLog` + actions, `notifyOnHomeScreen` |
| `src/store/useAppStore.ts` | Implementera activityLog, auto-push vid state-andringar |
| `src/components/home/DashboardGrid.tsx` | Aktivitet-flik, kategori-gruppering i Hem-vyn |
| `src/components/home/cards/DevicesSection.tsx` | `groupBy`-prop, kategori-headers med toggle-all |
| `src/components/home/cards/ActivityFeed.tsx` | **NY** -- aktivitetsflode-komponent |
| `src/components/devices/DeviceMarkers3D.tsx` | LightMarker laser brightness/color/colorTemp och applicerar pa 3D |
| `src/components/build/BuildInspector.tsx` | userCategory-dropdown, notifyOnHomeScreen-checkbox |

