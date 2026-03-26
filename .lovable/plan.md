

# BJORQ — 3 UI-förbättringar

## 1. Byt ColorWheel till RGB-sliders i LightControl

**Nuläge:** `DeviceControlCard.tsx` rad 325-334 renderar `<ColorWheel>` vid RGB-läge.

**Fix:** Ersätt `<ColorWheel>` med tre horisontella sliders (R, G, B) med färgade tracks:
- Röd slider: track med röd gradient, värde 0-255
- Grön slider: track med grön gradient, värde 0-255  
- Blå slider: track med blå gradient, värde 0-255
- Visa en liten färgpreview-cirkel bredvid (befintlig `rgbColor`)
- Behåll samma `update(id, { rgbColor: [...] })` logik

**Fil:** `DeviceControlCard.tsx` — ersätt ColorWheel-blocket (rad 325-334)

## 2. Stilrenare ikoner i CategoryManager

**Nuläge:** `CategoryManager.tsx` rad 9 använder emoji-ikoner: `['🏠', '💡', '❄️', '🔒', '📺', ...]`

**Fix:** Byt till Lucide-ikoner istället för emojis:
- Home, Lightbulb, Snowflake, Lock, Tv, Bot, Zap, Thermometer, Camera, Box
- Rendera som `<Icon size={16}>` i små knappar med samma select-logik
- Spara ikonnamn (string) istället för emoji
- Uppdatera rendering i kategorilistan att visa Lucide-ikon istället för emoji

**Fil:** `CategoryManager.tsx`

## 3. Mini-sparklines i InfoCard (UTE/ENERGI/KOMFORT)

**Nuläge:** InfoCard visar label + värde + detalj-text. Ingen visuell mätning.

**Fix:** Lägg till en liten SVG sparkline (ca 60x24px) till höger i varje InfoCard:
- Generera demo-datapunkter (senaste N timmar) som en enkel polyline
- **UTE:** 2h historik, blå linje — temperaturtrend
- **ENERGI:** 1h historik, amber linje — watt-trend  
- **KOMFORT:** 5h historik, grön linje — temperaturtrend
- Sparkline renderas som `<svg>` med en `<polyline>` — inga dependencies
- Layout: flex row med text till vänster, sparkline till höger

**Fil:** `DashboardGrid.tsx` — uppdatera `InfoCard` med optional `sparkData` prop

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `DeviceControlCard.tsx` | Ersätt ColorWheel med 3 RGB-sliders |
| `CategoryManager.tsx` | Emojis → Lucide-ikoner |
| `DashboardGrid.tsx` | InfoCard: sparkline till höger |

