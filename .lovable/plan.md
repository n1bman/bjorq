

# Fix: Aktivt rum höjd + brightness-bar RGB-färg

## Problem 1: Aktivt rum
Widgeten har `min-h-[260px]` och ingen max-höjd — den kan bli längre än 3D-vyn. Den ska:
- Matcha 3D-vyns höjd (240px mobil / 300px desktop)
- Bara visa enhet med namn + on/off-switch + brightness slider (för ljus) — inte alla enhetsdetaljer

**Fix i `DashboardGrid.tsx` → `ActiveRoomWidget`:**
- Byt `min-h-[260px]` → `h-[240px] md:h-[300px]` (samma som 3D-vyn)
- Behåll bara: enhetsnamn, brightness slider (för ljus), on/off switch per enhet
- Lägg `overflow-y-auto` på listan

## Problem 2: Brightness-bar färg matchar inte enhetens ljusfärg
I `CategoryCard.tsx` rad 169 läses `(state.data as any).rgb` men fältet heter `rgbColor` i `LightState`. Därför faller RGB-färgen aldrig igenom — den visar alltid default amber.

**Fix i `CategoryCard.tsx`:**
- Rad 169: Byt `const rgb = (state.data as any).rgb;` → `const rgb = (state.data as any).rgbColor;`
- Rad 183: Byt `const isRgbMode = (state?.data as any)?.colorMode === 'rgb';` OK men kolla även `(state?.data as any)?.rgbColor` istället för `(state?.data as any)?.rgb`

---

## Filer

| Fil | Ändring |
|-----|---------|
| `DashboardGrid.tsx` | ActiveRoomWidget: fast höjd, kompakt layout |
| `CategoryCard.tsx` | Byt `.rgb` → `.rgbColor` på 2 ställen |

