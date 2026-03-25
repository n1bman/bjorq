

# BJORQ Nordic Noir — Implementera designvisionen från screenshots

## Analys av vad screenshots visar vs nuläge

Bilderna visar en specifik visuell riktning som skiljer sig från nuläget på flera sätt:

### Vad som behöver ändras

**1. Kontrollpanelens Hem-vy (DashboardGrid HomeCategory)**
- **Nu:** Toolbar + SortableWidgetGrid med WidgetCard-wrapping
- **Vision:** Tre-kolumnslayout med:
  - Kolumn 1-2: "HOME OVERVIEW" hero-sektion med 3D-preview + snabbkontroller (Scener, Enheter, Klimat, Robot) + rumskort under med device filter tabs
  - Kolumn 3: Kontextpanel som visar "AKTIVT RUM" (valt rum med enheter) och "VALD ENHET" (detaljer för vald enhet)

**2. Summary bar (toppen)**
- **Nu:** Slim strip med widget-komponenter
- **Vision:** Större typografi med `label-micro` ovanför stora värden (TID → 14:00, UTE → 7C, ENERGI → 0 W, KOMFORT → 21.5). Mer Nordic Noir-känsla med tydligare hierarki.

**3. Nav rail (vänster)**
- **Nu:** Fungerar men gruppnamn och spacing kan förbättras
- **Vision:** Tydligare vertikal lista, alla kategorier synliga med labels, "Hemvy"/"Design" + "Hemstatus 18 aktiva" längst ner

**4. Höger kontextpanel (NY)**
- Visar info om aktivt rum och vald enhet
- Visar shell-info, Visual DNA-beskrivning
- Responsiv: visas på desktop, dold på tablet/mobil

---

## Fasindelning

### Fas 1: Summary bar — typografisk uppgradering
**Fil:** `DashboardShell.tsx` rad 278-283

Byt ut widget-komponenterna i summary bar mot en ren typografisk strip:
- Fyra kolumner: TID, UTE, ENERGI, KOMFORT
- Varje med `label-micro` rubrik + stort `value-display` värde
- Hämta data från befintliga store-hooks (weather, energy, comfort)

### Fas 2: Hem-kategori — trekolumnslayout med kontextpanel
**Fil:** `DashboardGrid.tsx` HomeCategory (rad 91-351)

Bygg om HomeCategory till trekolumnslayout:
- **Vänster (col-span-2):**
  - "HOME OVERVIEW" hero med 3D-preview (behåll DashboardPreview3D)
  - Grid med snabbkontroll-knappar (Scener, Enheter, Klimat, Robot)
  - Device filter tabs (Alla, Ljus, Armaturer, etc.) — redan finns
  - Rumskort under (CategoryCard per rum) — redan finns
- **Höger (col-span-1):**
  - "AKTIVT RUM" — visar valt rum med enheter och inline-kontroller
  - "VALD ENHET" — visar detaljkontroll (ljusstyrka, ton, scener)
  - State: `selectedRoom`, `selectedDevice` via useState

### Fas 3: Nav rail — polish och hemstatus
**Fil:** `DashboardShell.tsx` nav (rad 166-273)

- Visa alla kategorier med labels (inte collapsed som default på desktop)
- Lägg till "Hemstatus" längst ner med antal aktiva enheter
- Fixa spacing och typografi enligt screenshots

### Fas 4: Nordic Noir visuell polish
**Fil:** `index.css`

- Summary bar: mörkare bakgrund, subtilare border
- Rumskort: varmare amber-glow på aktiva enheter med brightness-bar
- Generellt: mer luft mellan sektioner, tydligare label-micro-hierarki

---

## Tekniska detaljer

### Summary bar data
```tsx
// Hämta från befintliga hooks/store
const weather = useAppStore(s => s.weather);
const markers = useAppStore(s => s.devices.markers);
const deviceStates = useAppStore(s => s.devices.deviceStates);
// Beräkna komfortvärde från comfort engine
```

### Trekolumnslayout
```text
┌─────────────────────────┬───────────┐
│ HOME OVERVIEW           │ AKTIVT    │
│ [3D Preview]            │ RUM       │
│ [Scener][Enheter]       │ Vardags.. │
│ [Klimat][Robot]         │ enheter.. │
│                         │           │
│ [Alla][Ljus][Arma...]   │ VALD      │
│ ┌─Sovrum──┐ ┌─Badrum─┐  │ ENHET     │
│ │ lamp 68%│ │lamp 78%│  │ Slider..  │
│ └─────────┘ └────────┘  │ Tonval..  │
│ ┌─Övrigt──┐ ┌─Hem────┐  │           │
│ │ TV      │ │Vacuum  │  │           │
│ └─────────┘ └────────┘  │           │
└─────────────────────────┴───────────┘
```

### Ändrade filer
| Fil | Ändring |
|-----|---------|
| `DashboardShell.tsx` | Summary bar typografi, nav rail polish, hemstatus |
| `DashboardGrid.tsx` | HomeCategory trekolumnslayout med kontextpanel |
| `index.css` | Eventuella nya utility-klasser |

### Bevaras
- All befintlig logik (store, hooks, HA-integration, 3D)
- CategoryCard-komponenten (rumskort)
- DeviceControlCard (enhetsdetaljer)
- SortableWidgetGrid (dragfunktion i edit-mode)
- Tablet/mobil-layouter (anpassas med responsiva breakpoints)

