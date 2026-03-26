

# Semantiska färgidentiteter för Energi, Klimat & Väder + Energi-redesign

## Översikt

Ingen ändring av temasystemet. Istället läggs tre lokala accentfärger ovanpå det aktiva temat via CSS-variabler och komponentuppdateringar.

**Färgidentiteter:**
- Energi: amber / warm gold (`36 75% 55%`)
- Klimat: mossgrön / sval grön (`140 20% 45%`)
- Väder: fjordblå / ice blue (`207 30% 55%`)

---

## 1. CSS-variabler i `src/index.css`

Lägg till under `:root` (inom `@layer base`):
```css
--section-energy: 36 75% 55%;
--section-climate: 140 20% 45%;
--section-weather: 207 30% 55%;
```

Dessa är fasta semantiska tokens — de påverkas inte av temabyte men fungerar ovanpå vilken bakgrund/panel som helst.

---

## 2. Energi-redesign (`EnergyDeviceList.tsx` + `EnergyWidget.tsx`)

**Nuläge:** Stor cirkulär ring som huvudfokus, sparkline sekundär.

**Nytt layout i `EnergyCategory` (DashboardGrid.tsx) / `EnergyDeviceList.tsx`:**

### a) KPI-rad (4 kort i grid)
- **Nu:** live watt med pulsande ikon
- **Idag:** kWh förbrukning
- **Kostnad:** kronor idag
- **Peak:** högsta watt-värde idag

Varje KPI-kort använder `border-[hsl(var(--section-energy))]` subtilt, och värdet i `text-[hsl(var(--section-energy))]`.

### b) Huvudgraf — area chart
- Byt fokus från cirkelring till en `AreaChart` (recharts, redan installerat) som huvudvisual.
- Amber gradient fill, amber linje, current-point markering.
- 24h tidsaxel.

### c) Fördelning — enhetsranking
- Befintliga ranking-bars i `EnergyDeviceList` — byt `bg-primary` till `bg-[hsl(var(--section-energy))]`.

### d) Ring/gauge
- Behåll som liten sekundär komponent (bredvid KPI-raden eller under grafen), inte som hero.
- Byt `stroke: hsl(var(--primary))` → `hsl(var(--section-energy))`.

### e) Sparkline (`EnergySparkline.tsx`)
- Byt `hsl(var(--primary))` → `hsl(var(--section-energy))` för linje, fill-gradient och pulsande punkt.

---

## 3. Klimat-identitet (`ClimateTab.tsx`, `ClimateTrendLine.tsx`, `ClimateRoomComparison.tsx`)

- **Hero-sektionen** (medeltemperatur): byt `text-primary` ikoner till `text-[hsl(var(--section-climate))]`.
- **Komfortstatus** (`Activity` ikon, aktiva regler): `text-primary` → `text-[hsl(var(--section-climate))]`.
- **Trendlinjer** (`ClimateTrendLine`): byt `stroke: hsl(var(--primary))` till `hsl(var(--section-climate))` för target-linjer och pulsande punkt.
- **Rumsjämförelse** (`ClimateRoomComparison`): byt `bg-primary/60` standardbar → `bg-[hsl(var(--section-climate))]/60`. Behåll orange/blå för avvikelse.
- **Regelkort** (`RuleCard`): aktiv-indikator `border-primary/20` → `border-[hsl(var(--section-climate))]/20`.

---

## 4. Väder-identitet (`WeatherWidget.tsx`, `WeatherHomeImpact.tsx`)

- **Hero-temperatur**: behåll vit/foreground, men lägg till en subtil `border-l-2 border-[hsl(var(--section-weather))]` på vänsterkant eller ändra 24h-prognos highlight `bg-primary/10` → `bg-[hsl(var(--section-weather))]/10`.
- **24h-prognos "Nu"**: markera med `bg-[hsl(var(--section-weather))]/10`.
- **Dagsprognos "Idag"**: samma fjordblå accent.
- **WeatherHomeImpact**: ikon `text-primary` → `text-[hsl(var(--section-weather))]` för rubrik-ikonen.
- **SunWeatherPanel**: rubrikikon kan byta till `text-[hsl(var(--section-weather))]`.

---

## 5. DashboardGrid kategori-wrapper

I `DashboardGrid.tsx`, ge varje kategoris wrapper en subtil top-accent:

```tsx
function EnergyCategory() {
  return (
    <div className="space-y-3" style={{ '--section-accent': 'var(--section-energy)' } as any}>
      ...
    </div>
  );
}
```

Detta gör det möjligt att i framtiden använda `var(--section-accent)` i delade widgets.

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/index.css` | 3 nya CSS-variabler (section-energy/climate/weather) |
| `src/components/home/cards/EnergyDeviceList.tsx` | Ny layout: KPI-rad + area chart som hero, ring sekundär, amber accent |
| `src/components/home/cards/EnergyWidget.tsx` | Amber accent på Zap-ikon och watt-display |
| `src/components/home/cards/EnergySparkline.tsx` | Byt primary → section-energy |
| `src/components/home/cards/ClimateTab.tsx` | Mossgrön accent på hero, status, regelkort |
| `src/components/home/cards/ClimateTrendLine.tsx` | Mossgrön target-linje och pulse-punkt |
| `src/components/home/cards/ClimateRoomComparison.tsx` | Mossgrön default-bar |
| `src/components/home/cards/WeatherWidget.tsx` | Fjordblå accent på prognos-highlights |
| `src/components/home/cards/WeatherHomeImpact.tsx` | Fjordblå rubrikikon |
| `src/components/home/DashboardGrid.tsx` | Minimal: eventuellt section-accent CSS-variabel per kategori |

