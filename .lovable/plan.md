

# Genomgång och fix av hela utseende-logiken

## Nulägesanalys — vad varje inställning faktiskt gör (och inte gör)

### Accentfärg (`--primary`)
Sätter `--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring`, `--amber-glow`. Påverkar: aktiva nav-tabs, ikoner (`text-primary`), slider tracks (`bg-primary`), fokusringar, progress bars, glödeffekter. **Påverkar INTE knappar** — de använder `bg-secondary`. Så funktionen är korrekt men borde ha tydligare etikett, t.ex. "Accentfärg (ikoner, sliders, aktiva element)".

### Slider-färg (`--slider-accent`)
**Totalt trasig** — variabeln sätts i `useThemeEffect` men används **ingenstans** i CSS eller komponenter. Slider-komponenten (`ui/slider.tsx`) använder `bg-primary`, inte `--slider-accent`. Dead code.

### Transparens (`glassOpacity`)
Sätter `--glass` med ny opacity. CSS:en i `glass-panel` använder `hsl(var(--glass))` — **detta borde fungera**. Men problemet är att CSS i `index.css` rad 49 definierar `--glass: 225 18% 8% / 0.85` som default, och temats useEffect overridar detta. Det funkar, men kan vara svårt att se skillnad p.g.a. `backdrop-filter: blur(24px)` som gör bakgrunden suddig oavsett.

### Border-synlighet (`borderOpacity`)
Formeln är **trasig**: `newL = 21 * (0.5 + borderOpacity * 2)`. Vid default 0.15 → `21 * 0.8 = 16.8%` — men bas-lightness för dark-temat är 21%, så det blir *mörkare* än default. Formeln borde istället skala temats egen lightness linjärt. Dessutom: `glass-panel` använder `--glass-border` med `/ 0.3` opacity i CSS, så ändringen syns knappt.

### Bakgrund/Knappar/Meny/Kort/Text
Dessa fungerar korrekt — de sätter rätt CSS-variabler.

---

## Plan: Fixa alla logikproblem

### 1. Fixa Slider-färg — wire `--slider-accent` till slider-komponenten
**Fil: `src/components/ui/slider.tsx`**
- Byt slider range-track från `bg-primary` till `bg-[hsl(var(--slider-accent,var(--primary)))]`
- Alternativt: sätt inline style med CSS-variabeln

### 2. Fixa Transparens — gör effekten tydligare
**Fil: `src/hooks/useThemeEffect.ts`**
- Nuvarande logik fungerar tekniskt, men slider-range 50-100% är för snävt. Byt till 30-100% så man kan se skillnad bättre.
- Sätt även `--glass` på `glass-panel-soft` genom att uppdatera en `--glass-soft` variabel (om den finns), annars räcker det.

### 3. Fixa Border-synlighet — vettig formel
**Fil: `src/hooks/useThemeEffect.ts`**
- Nuvarande formel: `21 * (0.5 + borderOpacity * 2)` — trasig.
- Ny formel: Läs ut temats bas-lightness, skala från 0% (osynlig) till bas*2 (tydlig).
- Byt border-opacity slider range till 0-50 (istället för 0-30) och uppdatera även alpha-komponenten i `--glass-border` opacity (från 0.0 till 0.5) istället för bara lightness.

### 4. Tydligare etiketter i ThemeCard
**Fil: `src/components/home/cards/ThemeCard.tsx`**
- "Accentfärg" → "Accentfärg (ikoner & aktiva element)" — kort beskrivning under
- "Slider" → ta bort om vi löser det via accent, ELLER behåll och notera "Slider-spår"

### 5. Accent-picker: ta bort debounce-miss på custom picker
**Fil: `src/components/home/cards/ThemeCard.tsx`**
- Rad 188: custom accent color picker saknar debounce (direkt `setProfile`). Wrap i `requestAnimationFrame` som övriga.

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/components/ui/slider.tsx` | Byt `bg-primary` till `--slider-accent` fallback |
| `src/hooks/useThemeEffect.ts` | Fix border-formel, transparens-range |
| `src/components/home/cards/ThemeCard.tsx` | Tydligare etiketter, debounce custom accent |

