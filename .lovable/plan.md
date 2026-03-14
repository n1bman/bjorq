

# Fix long-press timing (belt-and-suspenders) + version bump → 1.4.1

## Rotorsak

`clearTimeout` i `handleSelect` *borde* stoppa timern, men i R3F:s eventsystem kan det hända att `onPointerDown` på outer group och `onClick` på inner component inte synkar exakt som förväntat. Resultat: timern hinner ibland fyra trots `clearTimeout`.

## Fix: dubbel guard med `clickHandled` ref

**Fil:** `src/components/devices/DeviceMarkers3D.tsx`

Lägg till en `clickHandled` ref. Sätt den till `false` i `handlePointerDown3D` (ny interaktion börjar), och till `true` i `handleSelect` (klick processerat). I timer-callbacken: kolla `clickHandled.current` — om `true`, avbryt utan att öppna popup.

```ts
const clickHandled = useRef(false);

const handlePointerDown3D = useCallback((id: string) => {
  if (buildMode || !onLongPress) return;
  clickHandled.current = false;         // ny interaktion
  longPressTriggered.current = false;
  longPressTimer.current = setTimeout(() => {
    if (clickHandled.current) return;   // klick redan hanterat → avbryt
    longPressTriggered.current = true;
    onLongPress(id);
  }, 500);
}, [buildMode, onLongPress]);

const handleSelect = useCallback((id: string) => {
  clickHandled.current = true;          // markera att klick skett
  if (longPressTimer.current) {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }
  // ... resten oförändrad
}, [...]);
```

## Version bump → 1.4.1

| Fil | Ändring |
|-----|---------|
| `DeviceMarkers3D.tsx` | `clickHandled` ref guard |
| `package.json` | 1.4.0 → 1.4.1 |
| `bjorq_dashboard/config.yaml` | 1.4.0 → 1.4.1 |
| `README.md` | badge 1.4.1 |
| `CHANGELOG.md` | Ny `[1.4.1]` patch-sektion |

