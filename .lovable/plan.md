

# Fix: Borders följer textfärg + lägg till borderfärg + Text 1/Text 2

## Problem

1. **Borders ändras med textfärg** — `textColor` sätter `--foreground`, och många UI-element använder `border-foreground` (Tailwind) i stället för `border-border`. Därför ändras borders visuellt till samma färg som texten.

2. **Ingen kontroll över border-färg** — `borderOpacity` styr bara genomskinligheten och använder alltid `0 0% 100%` (vit). Användaren kan inte välja en annan border-färg.

3. **Bara en textfärg** — men temasystemet har två toner: `--foreground` (huvudtext) och `--muted-foreground` (sekundär, dämpad text). Användaren bör kunna styra båda.

---

## Ändringar

### 1. `src/store/types.ts` — utöka CustomColors

Lägg till tre nya fält:

- `borderColor?: string` — valfri hex för border-färg
- `textSecondaryColor?: string` — sekundär textfärg (`--muted-foreground`)

Byt namn internt (label i UI) från "Text" till "Text (primär)" och lägg till "Text (sekundär)".

### 2. `src/hooks/useThemeEffect.ts` — applicera nya overrides

**Border-färg:**
- Om `borderColor` finns: konvertera till HSL och använd den som bas för `--border` och `--glass-border` (med alpha från `borderOpacity`)
- Om `borderColor` saknas: behåll nuvarande beteende (vit med alpha)

**Sekundär text:**
- Om `textSecondaryColor` finns: sätter `--muted-foreground`, `--secondary-foreground`, `--sidebar-foreground`

### 3. `src/components/home/cards/ThemeCard.tsx` — uppdatera UI

Under "Färger & ytor":
- Byt "Text" → "Text 1" (primär)
- Lägg till "Text 2" (sekundär) → `textSecondaryColor`
- Lägg till "Border" → `borderColor`

Det ger nu 8 färgprickar i gridet: Knappar, Slider, Panel, Meny, Kort, Text 1, Text 2, Border.

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/store/types.ts` | `CustomColors` += `borderColor`, `textSecondaryColor` |
| `src/hooks/useThemeEffect.ts` | Applicera borderColor + textSecondaryColor overrides |
| `src/components/home/cards/ThemeCard.tsx` | Lägg till 2 nya color pickers (Text 2, Border), byt label Text→Text 1 |

