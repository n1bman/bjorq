

# Fix: Enskild väggmålning blockeras + färg syns från utsidan

## Problem 1: Kan inte måla enskilda väggar via inspektören
**Orsak**: `RoomWallSurfaces3D` i `InteractiveWalls3D` har `interactive={isPaintMode}` — i paint-mode fångar rum-ytlagret alla klick via `stopPropagation`, så klick når aldrig den underliggande väggen.

**Fix**: Rum-ytlagret ska bara vara interaktivt när ett **rum** redan är valt, inte när en **vägg** är vald. Ändra `interactive`-proppen:
```
interactive={isPaintMode && selection.type === 'room'}
```
Alternativt: låt rum-ytlagret INTE använda `stopPropagation` — istället avgör klick-hanteraren i InteractiveWalls3D om klicket ska välja rum eller vägg baserat på kontext. Men enklaste lösningen: rum-ytlagret är bara klickbart i room-selection-kontext.

## Problem 2: Färg läcker igenom vid vinkel
**Orsak**: `RoomWallSurfaces3D` skapar plan med `side: THREE.DoubleSide`. Det tunna planet är synligt från **båda** sidor — inklusive utsidan. Vid snäva vinklar syns rumsfärgen genom/runt väggens kant.

**Fix**: Ändra till `THREE.FrontSide` och säkerställ att planet orienteras med normalen **inåt** mot rummet. Planen skapas redan med korrekt rotation (`-angle`) och offset baserat på `facingSide`, men `DoubleSide` gör att baksidan (som pekar utåt) också renderas. Med `FrontSide` renderas bara den sida som pekar in i rummet.

## Problem 3: Byggerror
Stale — `RoomWallSurfaces3D.tsx` finns redan. Ingen åtgärd behövs.

## Problem 4: Console-varning (forwardRef)
Pre-existing `SliderWithInput` varning — ej relaterat till denna feature.

## Filer som ändras
| Fil | Ändring |
|-----|---------|
| `src/components/build/InteractiveWalls3D.tsx` | Ändra `interactive` prop till `isPaintMode && selection.type === 'room'` |
| `src/components/build/RoomWallSurfaces3D.tsx` | Ändra `THREE.DoubleSide` → `THREE.FrontSide` |

