

# Nytt tema "Nordic Noir" + utökade utseende-inställningar

## Vad som görs

### 1. Nytt tema: `nordic` (inspirerat av bild 1)
En fjärde temapalett med ännu djupare, varmare toner — som bilden visar: nästan svart bakgrund med varm charcoal-ton, amber-tonade kanter, och mjukare kontraster.

**`src/hooks/useThemeEffect.ts`:**
- Lägg till `nordicPalette` med värden inspirerade av bilden:
  - `--background`: ~`225 20% 7%` (djup grafit)
  - `--card`: ~`225 18% 10%` (varm mörk)
  - `--border`: ~`225 15% 15%` (subtil amber-tint)
  - `--glass`: hög blur, låg opacity
  - Generellt varmare undertoner än midnight

**`src/store/types.ts`:**
- Utöka `UserProfile.theme` till `'dark' | 'midnight' | 'light' | 'nordic'`

**`src/components/home/cards/ThemeCard.tsx`:**
- Lägg till `{ key: 'nordic', label: 'Nordic Noir' }` i themes-arrayen

### 2. Utökade utseende-inställningar i ThemeCard

Bygg ut ThemeCard med fler sektioner för manuell kontroll:

- **Knappfärg** — color picker eller förvalda färger för knappar (secondary-variabeln)
- **Sliderfärg** — separat accent för sliders/progress
- **Bakgrundsfärg** — custom hex för solid-bg-läge
- **Menyfärg** — sidebar-background override
- **Transparens** — slider (0.5–1.0) som styr `--glass` opacity
- **Border-synlighet** — slider (0–0.3) som styr border opacity

Dessa sparas i `UserProfile` som optional custom overrides:

```ts
customColors?: {
  buttonColor?: string;
  sliderColor?: string;
  bgColor?: string;
  menuColor?: string;
  glassOpacity?: number;    // 0.5-1.0
  borderOpacity?: number;   // 0-0.3
};
```

**`src/hooks/useThemeEffect.ts`:**
- Efter att tema-paletten applicerats, kolla `profile.customColors` och overrida relevanta CSS-variabler om satta

**`src/components/home/cards/ThemeCard.tsx`:**
- Ny sektion "Anpassat" med:
  - Färgcirklar + color input för knapp/slider/bg/meny
  - Slider för transparens och border-synlighet
  - "Återställ"-knapp som rensar `customColors`

### Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/store/types.ts` | `theme` union + `customColors` i UserProfile |
| `src/hooks/useThemeEffect.ts` | Nordic-palett + applicera customColors overrides |
| `src/components/home/cards/ThemeCard.tsx` | Nordic-knapp + utökade färg/transparens-inställningar |

