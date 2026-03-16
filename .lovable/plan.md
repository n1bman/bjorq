

# Fix: Miter-padding har inverterade tecken — skapar glipor istället för att stänga dem

## Problemanalys

Jag hittade buggen. I `computeMiterOffsets` (rad 202-207) appliceras padding som **förstärker** befintlig riktning:

```typescript
// NUVARANDE (FEL):
result.fromLeft += (fromLeft > 0 ? pad : -pad);  // positiv → mer positiv
result.fromRight += (fromRight > 0 ? pad : -pad); // negativ → mer negativ
```

Men titta på hur vertex-positionerna beräknas i `createMiteredWallGeometry`:

```text
FLB: [-halfLength + miter.fromLeft, ...]   // 'from'-änden
TLB: [+halfLength + miter.toLeft, ...]     // 'to'-änden
```

- **'from'-änden** (`-hl + offset`): mer negativt offset = vertex längre ut = väggen längre
- **'to'-änden** (`+hl + offset`): mer positivt offset = vertex längre ut = väggen längre

Den nuvarande paddingen gör att `fromLeft` (om positiv) blir **ännu mer positiv**, vilket drar vertexen **inåt** — gapet blir **större**. Samma inverterade effekt på alla fyra hörn.

```text
   NUVARANDE:  Padding drar vertexar inåt → gap öppnas
   ┌────┐  ┌────┐
   │    ╲  ╱    │    ← glipa vid diagonalen
   └─────╲╱────┘

   FIXAD:  Padding trycker vertexar utåt → lätt överlapp
   ┌─────╲╱─────┐
   │     ╲╱     │    ← ingen glipa
   └─────╱╲─────┘
```

## Ändring

### `src/lib/wallGeometry.tsx` — rad 202-207

Ändra padding-logiken så att vertexar alltid trycks **utåt** (gör väggen marginellt längre):

```typescript
const pad = 0.005;
// 'from' vertices: subtract pad to push toward -x (outward)
if (result.fromLeft  !== 0) result.fromLeft  -= pad;
if (result.fromRight !== 0) result.fromRight -= pad;
// 'to' vertices: add pad to push toward +x (outward)
if (result.toLeft    !== 0) result.toLeft    += pad;
if (result.toRight   !== 0) result.toRight   += pad;
```

En ändring, 6 rader, en fil. Alla L-hörn, sneda vinklar och hexagoner bör sluta visa glipor.

