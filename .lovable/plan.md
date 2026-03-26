

# Fix Nordic Noir-tema + förbättra utseende-inställningar

## Problem

1. **Nordic Noir har fel färger** — knapparna ska ha en varm sand/amber ton, inte kalla blågrå. Bilden visar tydligt varmare, sand-tonade knappar och UI-element mot en djup mörk bakgrund.
2. **Laggar vid färgändring** — varje color picker-ändring triggar `setProfile` → state-uppdatering → `useEffect` → DOM-manipulation, som skapar massa re-renders.
3. **Behövs fler anpassningsmöjligheter** — kort-färg, text-färg, m.m.
4. **Saknar tydlig "Eget tema"-sektion** vs färdiga teman.

## Ändringar

### 1. Uppdatera `nordicPalette` i `useThemeEffect.ts`

Bilden visar varma, sandiga toner. Nuvarande palette har kalla blåtoner (`225 hue`). Fix:

- `--secondary`: ändra från `225 14% 14%` → `30 12% 16%` (varm sand/charcoal)
- `--secondary-foreground`: `40 20% 82%` (varm ljus sand)
- `--muted`: `25 10% 13%`
- `--muted-foreground`: `35 10% 50%` (varm grå-sand)
- `--card`: `220 15% 9%` (behåll mörk men lite varmare)
- `--border`: `30 12% 20%` (varm amber-border)
- `--sidebar-accent`: `30 10% 13%`
- `--foreground`: `38 18% 88%` (varm off-white, inte kall)

Behåll djup bakgrund men skifta accent-variablerna åt amber/sand.

### 2. Fixa lagg — debounce color picker i `ThemeCard.tsx`

Lägg till en lokal `useRef` + `requestAnimationFrame` eller `setTimeout(16ms)` debounce i `ColorPickerDot` så att `setProfile` bara anropas max ~60fps istället för varje pixel-rörelse.

### 3. Utöka `CustomColors` i `types.ts`

Lägg till:
```ts
cardColor?: string;      // --card override
textColor?: string;      // --foreground override  
accentColor?: string;    // --primary override (separat från profil-accent)
```

### 4. Förbättra `ThemeCard.tsx` layout

- Separera tydligt: **Färdiga teman** (Mörkt/Midnatt/Ljust/Nordic Noir) i en sektion
- **Eget tema / Anpassat** i en separat sektion med:
  - Alla color pickers: Knappar, Slider, Bakgrund, Meny, Kort, Text
  - Sliders: Transparens, Border-synlighet
  - Återställ-knapp
- Applicera nya `cardColor`/`textColor` i `useThemeEffect.ts`

### 5. Applicera nya overrides i `useThemeEffect.ts`

I custom-blocket, lägg till:
- `cardColor` → `--card`, `--popover`
- `textColor` → `--foreground`, `--card-foreground`

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/hooks/useThemeEffect.ts` | Varmare nordicPalette + applicera cardColor/textColor |
| `src/components/home/cards/ThemeCard.tsx` | Debounce color picker, nya pickers (Kort, Text), tydligare layout |
| `src/store/types.ts` | `CustomColors` += `cardColor`, `textColor` |

