

# UI-kvalitetspass: Ikoner, typografi, responsivitet och systemkonsistens

## Översikt

Tre huvudområden + systemgenomgång, utan att röra temasystemet.

---

## 1. Ikoner — bort med emojis, konsekvent Lucide överallt

### Problem
- `DevicesSection.tsx` (rad 11-39): varje device-kind har `emoji: '💡'` etc., och dessa renderas som `<span className="text-lg">{info.emoji}</span>` (rad 184)
- `DashboardGrid.tsx` (rad 63-72): `deviceFilters` har emojis
- `WeatherWidget.tsx` (rad 6-11): `weatherIcons` är emojis (`☀️`, `☁️`, etc.)
- `SunWeatherPanel.tsx` (rad 11-23): väder- och nederbördsval har emojis
- `ScenesPanel.tsx` (rad 25): `PartyPopper` ikon finns (fest-känsla)
- `DashboardGrid.tsx` (rad 186, 273, 281): emojis som `💡`, `⚙️` i kategorinamn
- `CategoryCard.tsx` (rad 10-16): har redan `KIND_ICONS` med Lucide — men `DevicesSection.tsx` ignorerar den och använder emojis

### Åtgärd

**`src/components/home/cards/DevicesSection.tsx`:**
- Byt `emoji`-fältet i `kindInfo` till `icon: typeof Lightbulb` med Lucide-ikoner:
  - light → `Lightbulb`, switch → `Power`, sensor → `Thermometer`, climate → `Snowflake`, vacuum → `Bot`, camera → `Camera`, fridge → `Refrigerator` (finns ej i Lucide, använd `Box`), oven → `Flame`, washer → `WashingMachine` (finns ej, använd `Droplets`), garage-door → `Car`, door-lock → `Lock`, power-outlet → `Plug`, media_screen → `Monitor`, fan → `Fan`, cover → `Blinds` (finns ej, använd `PanelTop`), scene → `Play`, alarm → `ShieldAlert`, water-heater → `Flame`, humidifier → `Droplets`, siren → `Bell`, valve → `Settings2`, remote → `Radio`, lawn-mower → `Leaf`, speaker → `Speaker`, soundbar → `Music`, light-fixture → `Lightbulb`, smart-outlet → `Plug`, egg → `Egg`
- Rendera `<Icon size={18} className="text-muted-foreground" />` istället för emoji-span

**`src/components/home/DashboardGrid.tsx`:**
- `deviceFilters` (rad 63-72): ta bort `emoji`-fält, rendera utan emoji i filterchips (bara text)
- `HomeCategory` (rad 268-273, 281): byt `💡 ${roomName}` och `⚙️ Övrigt` till bara textlabels utan emoji-prefix
- `QuickScenesWidget` (rad 186): byt fallback `{scene.icon || '💡'}` till en Lucide fallback-ikon

**`src/components/home/cards/WeatherWidget.tsx`:**
- Byt `weatherIcons` från emojis till Lucide: `Sun`, `Cloud`, `CloudRain`, `Snowflake`
- Rendera som `<Icon size={...} />` istället för emoji-spans

**`src/components/home/cards/SunWeatherPanel.tsx`:**
- Byt emojis i `weatherOptions` och `precipOptions` till Lucide-ikoner

**`src/components/home/cards/ScenesPanel.tsx`:**
- Ta bort `PartyPopper` från `sceneIconOptions`, ersätt med t.ex. `Users` eller `Sparkles` (redan finns)

---

## 2. Typografi och läsbarhet

### Problem
- Många labels är `text-[9px]` eller `text-[10px]` — för litet på tablet
- `label-micro` i CSS är `font-size: 9px` — svårläst
- Nav rail labels `text-[9px]` (mobil, rad 101) och `text-[12px]` (desktop, rad 229) — tablet bör vara större
- InfoCard `text-[10px]` detail (rad 130)
- Filterchips `text-[10px]` / `text-[12px]` — borde vara minst `text-xs` (12px) på tablet
- Enhetsrader i DevicesSection: `text-sm` (14px) namn, `text-[10px]` quickInfo

### Åtgärd

**`src/index.css`:**
- Öka `label-micro` base till `10px`, med `@media (min-width: 768px)` → `11px`
- Lägg till utility-klass `.text-body` som är `14px` på mobil, `15px` på tablet

**`src/components/home/DashboardShell.tsx`:**
- Mobil bottom tab labels: `text-[9px]` → `text-[10px]`
- Desktop nav items: `text-[12px]` → `text-[13px]`
- Nav group labels: `text-[9px]` → `text-[10px]`
- Tablet nav (collapsed icon-rail): öka touch-target `py-3` → `py-3.5`

**`src/components/home/DashboardGrid.tsx`:**
- InfoCard detail: `text-[10px]` → `text-xs`
- InfoCard label-micro: redan bra, förbättras via CSS
- Filterchips: `text-[12px]` → `text-xs md:text-sm`, padding `px-4 py-2` → `px-4 py-2.5 md:px-5 md:py-3`
- "Hantera kategorier"/"Redigera" knappar: `text-[11px]` → `text-xs`, `h-8` → `h-9`

**`src/components/home/cards/DevicesSection.tsx`:**
- Device name: behåll `text-sm`
- QuickInfo: `text-[10px]` → `text-xs`
- Group header label: `text-xs` → `text-sm` on tablet

**`src/components/home/cards/CategoryCard.tsx`:**
- Device rows padding: `p-3` → `p-3 md:p-4`

**`src/components/home/cards/EnergyDeviceList.tsx`:**
- KPI labels och values — säkerställ `text-sm` minimum för läsbarhet

---

## 3. Responsiv anpassning

### Problem
- Content padding: `p-4 pb-24` (mobil), `p-6 md:p-8 lg:p-10` (desktop) — tablet behöver mer luft
- InfoCard grid: `grid-cols-2 md:grid-cols-4` — bra, men korten är trånga på tablet
- 3D preview hero: `h-[240px] md:h-[300px]` — kunde vara lite högre på desktop
- Filterchips: `overflow-x-auto` — bra för mobil, men spacing tight
- Mobile "Mer"-sheet: `grid-cols-3 gap-2` — touch-targets ok men tight
- Bottom tab bar: `h-14` — bra storlek
- Standby settings select: bör vara touch-friendly storlek

### Åtgärd

**`src/components/home/DashboardShell.tsx`:**
- Mobil content padding: `p-4` → `p-5`
- Desktop/tablet content: `p-6 md:p-8 lg:p-10` → `p-6 md:p-10 lg:p-12`
- Mobile "Mer"-sheet: `gap-2` → `gap-3`, `p-3` → `p-4` per item, `min-h-[48px]` touch-target
- Tablet nav rail touch targets: ensure `min-h-[48px]` per item

**`src/components/home/DashboardGrid.tsx`:**
- InfoCard: `p-4` → `p-4 md:p-5` för mer luft på tablet
- 3D hero: `h-[240px] md:h-[300px]` → `h-[220px] md:h-[320px] lg:h-[360px]`
- FilterChips row: `gap-2` → `gap-2 md:gap-3`
- Category cards spacing: `gap-4 md:gap-5` → `gap-4 md:gap-6`

**`src/components/home/cards/DevicesSection.tsx`:**
- Group toggle area: `mb-2` → `mb-3`
- Device card `p-3` → `p-3.5 md:p-4`

**`src/components/home/cards/ClimateTab.tsx`, `EnergyDeviceList.tsx`, `WeatherWidget.tsx`:**
- Säkerställ att KPI-rader, prognos-rader och kontroller har `min-h-[44px]` touch-targets

---

## 4. Systemkonsistens

- **FilterChips**: `DevicesCategory` (rad 453-461) använder `Button` med emojis + `h-7 text-[10px]` — byt till samma chip-stil som `HomeCategory` (rad 364-378) och ta bort emojis
- **strokeWidth-konsistens**: Nav rail använder `1.4`/`2.2`, men DashboardGrid tabs använder default. Normalisera till `1.5` default / `2` active
- **Select-element**: StandbySettings (rad 521-530) och andra `<select>` — säkerställ minst `h-10` och `text-sm` för touch
- **Switch scale**: `className="scale-90"` i DevicesSection — ta bort, låt switchen vara full-size för touch

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/index.css` | Öka label-micro base, lägg till responsiv scaling |
| `src/components/home/DashboardShell.tsx` | Typografi-storlekar, padding, touch-targets |
| `src/components/home/DashboardGrid.tsx` | Bort med emojis i filters/kategorier, typografi, spacing, responsivitet |
| `src/components/home/cards/DevicesSection.tsx` | Emojis → Lucide-ikoner, typografi, spacing |
| `src/components/home/cards/CategoryCard.tsx` | Padding-justeringar |
| `src/components/home/cards/WeatherWidget.tsx` | Emojis → Lucide-ikoner |
| `src/components/home/cards/SunWeatherPanel.tsx` | Emojis → Lucide-ikoner |
| `src/components/home/cards/ScenesPanel.tsx` | Ta bort PartyPopper |
| `src/components/home/cards/EnergyDeviceList.tsx` | Touch-target sizes |
| `src/components/home/cards/ClimateTab.tsx` | Touch-target sizes |

