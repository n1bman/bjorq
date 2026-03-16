

# Fix: Färgläckage vid hörn/korsningar

## Problem
Vid vissa kameravinklar syns färgen från ett intilliggande rum genom den lilla spalten där geringade väggar möts. Vägggeometrin i sig är korrekt — problemet är att de snedskurna ändarna inte ger 100% tätning vid alla betraktningsvinklar.

## Orsak
I `generateCornerBlocks` (rad 1248) genereras hörn-fyllnadsblock **bara** för L-hörn (`connectionCount === 2`). T-korsningar hoppas över med antagandet att genomgående väggen täcker — men vid snäva vinklar kan ett litet glapp synas ändå.

## Lösning — utan att ändra väggbygget
Utöka corner-fill-blocken till att även genereras vid T-korsningar och korsningar (ta bort `connectionCount !== 2`-filtret, eller ändra till `connectionCount < 2`). Blocken är redan `DoubleSide`-renderade och använder dominant väggfärg, så de kommer täta mikroglappet utan att påverka utseendet i övrigt.

### Ändring: `src/lib/wallGeometry.tsx`
**Rad 1246-1248** — ändra filtret:
```typescript
// Before: if (connectionCount !== 2) continue;
// After:  if (connectionCount < 2) continue;  // Generate fills for L, T, and + junctions
```

En rad ändrad. Inga ändringar i vägggeometri, miter-logik eller materialhantering. Väggarna byggs exakt som nu — corner-fill-blocken tätar bara eventuella synliga spalter vid alla junction-typer.

