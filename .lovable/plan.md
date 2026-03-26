

# Fix: Accentfärg sparas inte + senast använda färger + spara egna teman + synligare Återställ

## Problem
1. **Custom accent sparas inte** — om man väljer en egen färg via color picker och den inte matchar en preset, fungerar det live men vid reload kan den gå tillbaka till default.
2. **Ingen historik** — om man väljer en färg på knappar/meny/etc. kan man inte enkelt återanvända den på en annan plats.
3. **Kan inte spara egna teman** — man kan anpassa allt men inte spara som en preset att byta tillbaka till.
4. **Återställ-knappen** är för liten och osynlig.

## Ändringar

### 1. Fixa accent-sparning (`ThemeCard.tsx`)
Custom accent-picker anropar `setProfile({ accentColor })` korrekt, men problemet är att den **bara triggar i `requestAnimationFrame`** — sista värdet kanske inte hinner sparas om man stänger snabbt. Byt till att alltid spara det slutliga värdet via `onBlur` / `onChange` utan att förlita sig enbart på rAF.

### 2. Senast använda färger (`types.ts` + `ThemeCard.tsx`)
- Lägg till `recentColors?: string[]` i `CustomColors` (max 6 stycken)
- Varje gång en färg väljs via ColorPickerDot eller accent-picker, pusha den till `recentColors` (dedup, max 6)
- Visa en rad "Senast använda" med små cirklar ovanför färgprickarna, om det finns några

### 3. Spara egna teman (`types.ts` + `ThemeCard.tsx`)
- Lägg till `savedThemes?: Array<{ name: string; accentColor: string; customColors: CustomColors }>` i `UserProfile`
- Lägg till en "Spara som tema"-knapp under anpassningssektionen som öppnar en liten namnruta
- Sparade teman visas som extra knappar under de färdiga temana med en liten X för att ta bort

### 4. Synligare Återställ-knapp (`ThemeCard.tsx`)
- Flytta ut från inline-positionen, gör den till en tydlig knapp med `border border-destructive/50 text-destructive` styling, placerad längst ner i anpassningssektionen
- Visa alltid när `showCustom` är öppet (inte bara villkorligt)

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/store/types.ts` | `recentColors` i CustomColors, `savedThemes` i UserProfile |
| `src/components/home/cards/ThemeCard.tsx` | Fix accent save, recent colors, save theme, synligare Återställ |

