

# Utseende-systemet — fullständig ombyggnad

## Översikt

Bygger om hela temainställningspanelen och det underliggande tokensystemet till ett riktigt kontrollcenter med Nordic Noir som förstklassigt premiumtema, intelligenta defaults, och professionell UX.

---

## 1. Nytt token-system i `useThemeEffect.ts`

Byter från nuvarande begränsade palett (~20 variabler) till ett utökat system med ~35 variabler per tema. Nordic Noir-paletten byggs om helt efter den specificerade färgsättningen:

**Nordic Noir tokens (hex → HSL):**
- `--background`: `#07090d` → `220 30% 4%`
- `--surface`: `#0b0e14` → `220 28% 6%`
- `--card` / `--popover`: `#171b24` → `222 20% 11%`
- `--secondary` (knappar): `#1c212b` → `220 18% 14%`
- `--foreground`: `#f3efe8` → `38 25% 93%`
- `--secondary-foreground`: `#b9b1a5` → `32 12% 68%`
- `--muted-foreground`: `#7f7a73` → `30 5% 47%`
- `--border`: `0 0% 100% / 0.10` (rgba-baserad)
- `--glass-border`: `0 0% 100% / 0.06`
- `--sidebar-background`: `#0b0e14`
- `--glass`: `220 28% 6% / 0.88`

Nya CSS-variabler som alla teman får:
- `--glow-intensity`: styr amber-glow multiplicator (0–1)
- `--nn-fjord`: `#6f8fa8`, `--nn-ice`: `#a8bcc9`, `--nn-moss`: `#748b6f`, `--nn-lavender`: `#8c7aa8`, `--nn-linen`: `#d8c7a8`
- `--amber-soft`: `rgba(215,163,93,0.18)` som separat token

Nordic Noir sätter default accent till `#d7a35d` (amber).

### Intelligent defaults per tema

När ett tema väljs sätts "rekommenderade" värden för customColors om användaren inte har overridat dem. Detta görs genom att `useThemeEffect` först applicerar hela temaletten, sedan lägger custom overrides ovanpå — precis som idag, men med fler tokens.

---

## 2. Utökad `CustomColors` i `types.ts`

```ts
export interface CustomColors {
  buttonColor?: string;
  sliderColor?: string;
  bgColor?: string;
  menuColor?: string;
  cardColor?: string;
  textColor?: string;
  sceneOverlayColor?: string;
  glassOpacity?: number;    // 0.2–1.0
  borderOpacity?: number;   // 0–0.5
  glowIntensity?: number;   // 0–1.0 (ny)
  recentColors?: string[];
}
```

`SavedTheme` utökas med `theme: string` så man vet vilken bas den bygger på.

---

## 3. Ombyggd ThemeCard — premium kontrollcenter

Hela `ThemeCard.tsx` byggs om med tydlig hierarki:

### Sektion A: Bas-tema (alltid synlig)
- 4 presets som kort med liten färgpreview (inte bara text)
- Nordic Noir får en premium-badge/markering
- Sparade teman listas här som extra kort med X-knapp

### Sektion B: Scen-bakgrund
- 3D-vy / Gradient / Enfärgad (som idag men renare)
- Enfärgad visar color picker

### Sektion C: "Anpassa" — expanderbar
Omorganiserat i logiska grupper med tydliga rubriker:

**Färger:**
- Accent (ikoner, aktiva element) — presets + custom picker
- Ytor (kort, paneler) — color picker
- Meny — color picker
- Text — color picker
- Knappar — color picker
- Slider-spår — color picker

**Material & känsla:**
- Transparens (slider 20–100%)
- Border-synlighet (slider 0–50%)
- Glow-intensitet (slider 0–100%) — ny

**Senast använda färger** — rad med max 6 cirklar, klick applicerar på senaste aktiva fält

**Spara tema** — knapp + namnfält

**Återställ** — tydlig knapp längst ner

### Förbättringar i UX:
- Varje färg-picker committar på blur (som idag men fixat)
- Sliders uppdaterar direkt utan debounce-problem (de är redan snabba)
- Labels är tydligare — inga "developer"-termer
- Bättre spacing och visuell hierarki med section dividers

---

## 4. Glow-intensitet i `useThemeEffect.ts`

Ny logik: om `customColors.glowIntensity` finns, skala `--amber-glow` och `--warm-glow`:
```ts
const glow = customColors.glowIntensity ?? 0.5;
root.style.setProperty('--amber-glow', `${hsl} / ${(0.15 * glow * 2).toFixed(3)}`);
```

---

## 5. Border-logik — fix

Nuvarande formel är trasig. Ny approach:
- Border-variabeln byter till rgba-stil: `0 0% 100% / {opacity}`
- `borderOpacity` (0–0.5) styr direkt alpha
- Enklare, mer förutsägbar, och funkar med alla teman

---

## 6. SavedTheme utökas

```ts
export interface SavedTheme {
  id: string;
  name: string;
  theme: string;        // bas-temat (ny)
  accentColor: string;
  customColors: CustomColors;
}
```

Vid laddning sätts även `profile.theme` till det sparade bas-temat.

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/store/types.ts` | `CustomColors` += `glowIntensity`, `SavedTheme` += `theme` |
| `src/hooks/useThemeEffect.ts` | Nordic Noir-palett ombyggd med rätt tokens, glow-logik, border-fix, fler CSS-variabler |
| `src/components/home/cards/ThemeCard.tsx` | Helt ombyggd layout — premium kontrollcenter med grupper, glow-slider, bättre UX |
| `src/index.css` | Nya CSS-variabler i `:root` (nn-fjord, nn-ice, etc., glow-intensity) |

