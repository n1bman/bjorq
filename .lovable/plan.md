

# BJORQ — Ta bort SummaryBar, gör allt till fria widgets i samma grid

## Vad du vill

Bilden visar tydligt: TID, UTE, ENERGI och KOMFORT är **vanliga kort/widgets i samma grid** som 3D-vyn, Aktivt rum, rumskorten och allt annat. Det finns ingen separat bar — allt lever i samma fria yta.

## Ändringar

### 1. `DashboardShell.tsx`
- **Ta bort `<SummaryBar />`** helt från layouten
- Ta bort hela `SummaryBar`-funktionen
- Huvudinnehållet (`<Content />`) fyller hela ytan utan en fast strip ovanför

### 2. `DashboardGrid.tsx` — HomeCategory
Bygg om HomeCategory så att **allt** är widgets i samma grid:

```text
┌─TID──────┐ ┌─UTE──────┐ ┌─ENERGI───┐ ┌─KOMFORT──┐
│ 14:00    │ │ 7°C      │ │ 0 W      │ │ 21.5°    │
│ Onsdag.. │ │ Molnigt  │ │ Normal   │ │ Optimal  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

┌─3D-vy (hero, col-span-2)────────┐ ┌─Aktivt rum──────────┐
│                                   │ │ Vardagsrum           │
│  [DashboardPreview3D]             │ │ Skap lampa-1  78% ◉  │
│                                   │ │ Ljusarmatur   62% ◉  │
│  [Scener] [Enheter]              │ │ Fönsterlampa      ◉  │
│  [Klimat] [Robot]                │ │                      │
└───────────────────────────────────┘ └──────────────────────┘

[Alla] [Ljus] [Armaturer] [Klimat] [Media] [Robot] [Lås] [Sensor]

┌─Sovrum───────┐ ┌─Badrum───────┐
│ 2/2 på       │ │ 1/1 på       │
│ devices...   │ │ devices...   │
└──────────────┘ └──────────────┘
┌─Övrigt──────┐ ┌─Hem──────────┐
│ TV           │ │ Vacuum       │
└──────────────┘ └──────────────┘
```

- TID/UTE/ENERGI/KOMFORT blir **4 st nn-widget kort** i rad 1 av gridet
- 3D-vyn + Aktivt rum sida vid sida i rad 2
- Filter tabs + rumskort under — precis som nu men i samma flöde
- Högerkolumnen (Aktivt rum) är **bara ett till kort i gridet** — inte en separat panel
- Allt i **ett enda fritt CSS grid** med `grid-cols-4` som bas

### 3. Aktivt rum-widget
- Visar valt rum (klickbart från rumskorten)
- Listar enheter i det rummet med toggle/brightness
- State: `selectedRoomId` via useState
- Klick på ett rumskort → sätter selectedRoomId → Aktivt rum uppdateras

### Tekniskt
- Ta bort `SummaryBar` funktion + anrop i `DashboardShell.tsx`
- Flytta TID/UTE/ENERGI/KOMFORT-logiken in i `HomeCategory` som 4 kort-komponenter
- Aktivt rum = en ny liten inline-komponent i HomeCategory
- Inget nytt dependency — bara omstrukturering

### Filer som ändras
| Fil | Ändring |
|-----|---------|
| `DashboardShell.tsx` | Ta bort SummaryBar |
| `DashboardGrid.tsx` | HomeCategory: 4 info-kort + 3D + aktivt rum i samma grid |

