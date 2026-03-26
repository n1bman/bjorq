

# Fix: Enhets-widgets som individuella fria element, inline-expand, Nordic Noir default, border-bugg

## Problem

1. **Enhets-widgets sitter i en scrollbar rad** — alla valda enheter renderas i en horisontell pill-rad (`max-w-[500px] overflow-x-auto`). Användaren vill att varje enhet ska vara en egen widget som kan placeras fritt, precis som klocka/väder/scener.

2. **Smarta enheter (vacuum/TV/klimat) expanderar utanför** — expandpanelen renderas ovanför pill-raden i en separat glass-panel. Ska expandera inline under/inom respektive enhets-widget.

3. **Nordic Noir ska vara default-tema** — idag startar systemet med `theme: 'dark'`.

4. **Border-synlighet blir vit** — när man drar border-slidern sätts `borderOpacity` men `borderColor` saknas i state, vilket gör att `useThemeEffect` faller tillbaka på palette-värdet. Problemet: efter att opacity sätts kan inte border-färgen ändras separat eftersom den aldrig sparats explicit. Fix: sätt `borderColor` från defaults automatiskt första gången opacity ändras.

---

## 1. Enheter som individuella fria widgets

**Koncept:** Varje enhet vald via "Enhets-widgets" i kontrollpanelen blir en egen positionerbar widget på hemvyn — inte en pill i en rad.

### `src/components/home/HomeView.tsx`

- **Ta bort** den horisontella pill-raden (`<div className="flex gap-2 overflow-x-auto ...">`) och expand-panelen ovanför.
- **Ersätt** med: varje `selectedMarker` renderas som ett eget `<div className="absolute z-10 pointer-events-auto">` med position från `widgetLayout[m.id]` (fallback: auto-staggera baserat på index).
- Varje enhets-widget renderas som en kompakt glasspanel med:
  - Ikon + namn + on/off-toggle (för toggleable)
  - Status-indikator (dot)
  - **Inline expand** för vacuum/climate/media — klick på widgeten expanderar panelen **nedåt inom samma widget**, inte i separat overlay.
- Positionering: `getPos(m.id)` som söker `widgetLayout[m.id]`, fallback till auto-position (staggera längs botten).

### `src/components/home/HomeLayoutEditor.tsx`

- Lägg till varje vald enhet som ett draggable element i editorn (utöver de fasta 9 widgetarna).
- Varje enhet får sin egen key baserat på `m.id`, label = `m.name || m.kind`.
- `hasSize: false` (enhets-widgets har fast storlek).
- Drag-positioner sparas i `widgetLayout[m.id]`.

### `src/store/types.ts` / `src/store/useAppStore.ts`

- `widgetLayout` stöder redan godtyckliga strängar som nycklar (`Record<string, {...}>`). Verifiera att typen tillåter device-ID:n som nycklar — om det är `Record<HomeWidgetKey, ...>` behöver det ändras till `Record<string, ...>`.

### Inline expand-design

- Vacuum: klick → widgeten expanderar nedåt med Städa/Paus/Stopp/Docka-knappar
- Climate: klick → expanderar med temp +/- kontroller
- Media: klick → expanderar med Play/Paus
- Enkla enheter: klick → toggle on/off direkt

## 2. Nordic Noir som default

### `src/store/useAppStore.ts` rad 390

Ändra:
```ts
profile: { name: '', theme: 'nordic', accentColor: '#d7a35d', dashboardBg: 'scene3d' },
```

## 3. Border-opacity bugg

### `src/components/home/cards/ThemeCard.tsx` rad 369

När `borderOpacity` ändras, sätt även `borderColor` om den inte redan är satt:
```ts
onValueChange={([v]) => {
  const changes: Partial<CustomColors> = { borderOpacity: v / 100 };
  if (!custom.borderColor) {
    changes.borderColor = defaults.borderColor;
  }
  updateCustom(changes);
}}
```

Detta säkerställer att `borderColor` alltid finns i state när opacity ändras, så att efterföljande färgändringar fungerar.

---

## Berörda filer

| Fil | Ändring |
|-----|---------|
| `src/components/home/HomeView.tsx` | Ersätt pill-rad med individuella fria enhets-widgets med inline expand |
| `src/components/home/HomeLayoutEditor.tsx` | Lägg till device-markers som draggable element |
| `src/store/useAppStore.ts` | Default theme → `'nordic'`, accent → `'#d7a35d'` |
| `src/store/types.ts` | Verifiera/ändra `widgetLayout` typ till `Record<string, ...>` |
| `src/components/home/cards/ThemeCard.tsx` | Sätt borderColor explicit vid opacity-ändring |

