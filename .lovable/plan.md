

# Fix: Menyer flyter utanför skärmen + knappen förflyttas vid klick

## Rotorsak

1. **Knappen flyttas vid klick**: `flex-col-reverse` gör att när menyn öppnas tar den plats i flex-flödet, vilket skjuter knappen nedåt. Positionen `top: 78%` + flex-content ovanför = knappen hamnar utanför skärmen.

2. **Menyn flyter utanför**: Inga gränser på popup-positionering. Menyn renderas relativt i flex-flödet utan hänsyn till viewport-kanter.

3. **Drag-gränser saknas**: Elementen kan dras till 95%/92% men deras innehåll (widget-bredd/höjd) gör att de går utanför viewport.

## Fix

### 1. CameraFab, RoomNavigator, HomeNav — byt från flex-col-reverse till absolut-positionerad popup

Alla tre komponenterna ska:
- Ha en **enkel wrapper utan flex-direction** — bara `position: relative` + `pointer-events-auto`
- Knappen sitter i wrappern som enda flow-element
- Menyn renderas som `position: absolute; bottom: 100%; right: 0` (alltid ovanför knappen)
- Ingen flex som kan flytta knappens position

Exempel-struktur:
```
<div style={style} className="z-50 pointer-events-auto relative">
  <button>...</button>
  {open && (
    <div className="absolute bottom-full right-0 mb-2 ...">
      ...meny...
    </div>
  )}
</div>
```

**Filer:** `CameraFab.tsx`, `RoomNavigator.tsx`, `HomeNav.tsx`

### 2. Drag-gränser i HomeLayoutEditor — clampa med element-storlek

**Fil:** `HomeLayoutEditor.tsx` rad 94-95

Ändra max-clamp från `95`/`92` till lägre värden som tar hänsyn till elementstorlek:
- x: `Math.max(1, Math.min(88, ...))` — ger ~12% marginal höger
- y: `Math.max(1, Math.min(85, ...))` — ger ~15% marginal botten

### 3. Samma clamp i HomeView för live-positioner

**Fil:** `HomeView.tsx` `getPos()`-funktionen (rad 112-118)

Clampa returnerade positioner så att live-element aldrig renderas utanför viewport:
```ts
const getPos = (key) => {
  const config = widgetLayout[key];
  return {
    x: Math.max(1, Math.min(88, config?.x ?? DEFAULT_POSITIONS[key].x)),
    y: Math.max(1, Math.min(85, config?.y ?? DEFAULT_POSITIONS[key].y)),
  };
};
```

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/components/home/CameraFab.tsx` | Byt flex-col-reverse → relative wrapper + absolute popup ovanför |
| `src/components/home/RoomNavigator.tsx` | Samma |
| `src/components/home/HomeNav.tsx` | Samma |
| `src/components/home/HomeLayoutEditor.tsx` | Striktare drag-clamp (88%/85%) |
| `src/components/home/HomeView.tsx` | Clampa getPos() för live-rendering |

