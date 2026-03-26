

# Fix: Text/Border-mappning är felkopplad + custom accent sparas inte

## Problem

1. **Text 1 ändrar borders istället för text** — `textColor` sätter `--foreground`, men många UI-element använder Tailwind-klassen `border-foreground` (inte `border-border`), så borders följer med.

2. **Text 2 ändrar text istället för att vara sekundär** — mappningen är korrekt men upplevs som "den riktiga textfärgen" eftersom `--muted-foreground` används brett.

3. **Border-pickern har oklar effekt** — den sätter `--border` med alpha, men eftersom de flesta borders i UI:t använder `border-foreground` syns det knappt.

4. **Custom accent sparas inte** — color picker har `onChange={() => {}}` (tom!) och `onBlur` läser `e.target.value` men inputen uppdateras aldrig visuellt under drag.

## Lösning

### 1. Fix textColor-override i `useThemeEffect.ts`

När `textColor` sätts, sätt BARA text-relaterade variabler och sätt EXPLICIT `--border` till temats original-border (inte foreground):

```
--foreground, --card-foreground, --popover-foreground → textColor HSL
```

Samtidigt: om INGEN `borderColor` är satt, force-sätter vi `--border` till temats default-bordervärde efter textColor-overriden. Detta förhindrar att `border-foreground` letar fallback.

### 2. Fix border-override

Utöver `--border` och `--glass-border`, sätt även `--sidebar-border` vid borderColor-override.

### 3. Fix custom accent picker i `ThemeCard.tsx`

Byt till samma `CommitColorPicker`-mönster som övriga pickers — `useRef` för att fånga senaste värdet, commit på blur:

```tsx
<CommitColorPicker
  label="Egen"
  value={profile.accentColor}
  onCommit={(c) => setAccentColor(c)}
/>
```

### 4. Tydligare labels

- "Text 1" → "Text" (primär — rubriker, labels)
- "Text 2" → "Text sekundär" (dämpad — hjälptext, ikoner)
- "Border" behåller namn men blir tydligare att den styr panelramar

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/hooks/useThemeEffect.ts` | Force-reset `--border` efter textColor-override om ingen borderColor finns |
| `src/components/home/cards/ThemeCard.tsx` | Fix custom accent picker (CommitColorPicker), bättre labels |

