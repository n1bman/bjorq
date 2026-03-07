

# Fix: Dörrar och fönster syns inte i Hem-vyn

## Problem

I `Walls3D.tsx` (som används i Hem-vyn) saknas raden `cursor = opEnd` i forEach-loopen som itererar öppningar. Variabeln `cursor` stannar på `0` genom hela loopen.

Detta gör att:
- Varje "segment före öppning" börjar från 0 → överlappande geometri
- "Sista segmentet" täcker hela väggen → döljer alla öppningar

`InteractiveWalls3D.tsx` (Build-vyn) har rätt logik med `cursor = opEnd` på rad 467.

## Fix

**En rad** behöver läggas till i `src/components/build/Walls3D.tsx`:

Rad 393–394, precis innan `});` som stänger `sortedOpenings.forEach`:

```typescript
          }

          cursor = opEnd;  // ← DENNA RAD SAKNAS
        });
```

Det är allt. Ingen annan fil behöver ändras.

