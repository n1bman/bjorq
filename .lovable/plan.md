

# Fix long-press timing + version bump → 1.4.0

## Problem
Long-press på 3D-markörer i hemvyn triggas direkt vid tryck istället för efter 500ms. Orsak: R3F:s eventsystem — `onPointerUp` på yttre `<group>` firear inte alltid när klick konsumeras av inre komponent, så 500ms-timern rensas aldrig och popupen öppnas ändå.

## Fix: Timestamp-baserad long-press (inga timers)

**`src/components/devices/DeviceMarkers3D.tsx`**

Ersätt timer-baserad long-press med timestamp-approach:
- `pointerDownTime` ref istället för `longPressTimer` + `longPressTriggered`
- `handlePointerDown3D`: spara `Date.now()` och starta 500ms timer som sätter `longPressTriggered = true` och anropar `onLongPress`
- `handleSelect` (onClick): om `longPressTriggered` → noop + reset. Annars → toggle som vanligt.
- **Kritisk fix**: Flytta `onPointerUp`/`onPointerLeave` till VARJE individuell marker-komponent istället för bara outer group, ELLER bättre: ta bort timer helt och använd timestamp i `handleSelect`:

```ts
const pointerDownTime = useRef(0);

const handlePointerDown3D = useCallback((id: string) => {
  if (buildMode || !onLongPress) return;
  pointerDownTime.current = Date.now();
  longPressTimer.current = setTimeout(() => {
    longPressTriggered.current = true;
    onLongPress(id);
  }, 500);
}, [buildMode, onLongPress]);

const handleSelect = useCallback((id: string) => {
  // Always clear timer on click (acts as pointerUp substitute)
  if (longPressTimer.current) {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }
  if (buildMode) {
    setSelection({ type: 'device', id });
  } else {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    // toggle...
  }
}, [...]);
```

Nyckel: **rensa timern i `handleSelect`** (som alltid firear vid klick) istället för att förlita sig på `onPointerUp` på outer group.

## Version bump → 1.4.0

Uppdatera version i:
- `package.json` — `"version": "1.4.0"`
- `bjorq_dashboard/config.yaml` — `version: "1.4.0"`
- `README.md` — badge
- `CHANGELOG.md` — ny `[1.4.0]`-sektion med alla ändringar sedan 1.3.0:
  - Per-enhet ljusegenskaper (intensitet, räckvidd, konvinkel, penumbra)
  - Spara kameravy via dubbelklick i kontrollpanelens 3D-widget
  - Ljusarmaturer av/på i hemvy (state-migration)
  - Long-press på 3D-markörer för kontrollpopup
  - LED-bar nya defaults (0.5x, 1.4m, 118°, 0.70)
  - Fix: long-press timing (timer rensas korrekt)

## Filändringar

| Fil | Ändring |
|-----|---------|
| `DeviceMarkers3D.tsx` | Rensa timer i `handleSelect` |
| `package.json` | 1.3.0 → 1.4.0 |
| `bjorq_dashboard/config.yaml` | 1.3.0 → 1.4.0 |
| `README.md` | Badge 1.4.0 |
| `CHANGELOG.md` | Ny [1.4.0]-sektion |

