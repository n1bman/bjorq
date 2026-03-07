

# Fix: T-korsningar i rumsdetektering

## Problem

Grafen i `buildGraph()` kopplar bara ihop väggar som delar exakt samma **endpoint**. Men i din planlösning slutar många innerväggar mitt på en yttervägg — en **T-korsning**. Grafen ser inte denna koppling, så cykeln bryts och rummet detekteras aldrig.

```text
A ────────────── B        ← Yttervägg (from=A, to=B)
        |                  ← Innervägg (from=C, to=D, där D ligger PÅ A-B men D ≠ A och D ≠ B)
        C

Grafen har kanter: A↔B, C↔D
Men D sitter mitt på A-B → ingen koppling A↔D eller D↔B
→ Inget rum detekteras
```

## Lösning

Lägg till ett **T-junction-splittningssteg** i `detectRooms()` INNAN grafen byggs. För varje vägg-endpoint, kontrollera om den ligger nära (inom EPSILON) mitten av en annan vägg. Om ja → splitta den andra väggen i två vid den punkten.

### `src/lib/roomDetection.ts`

Ny funktion `splitAtTJunctions(walls)`:

```typescript
function splitAtTJunctions(walls: WallSegment[]): WallSegment[] {
  // Samla alla unika endpoints
  // För varje endpoint, testa om den är nära (< EPSILON) linjesegmentet 
  // av en ANNAN vägg (men inte nära den väggens endpoints)
  // Om ja → splitta den väggen i två vid projektionspunkten
  // Returnera den utökade vägglistan
}
```

Anropa i `detectRooms()`:
```typescript
export function detectRooms(walls: WallSegment[], existingRooms?: Room[]): Room[] {
  if (walls.length < 3) return [];
  const splitWalls = splitAtTJunctions(walls);  // ← NY
  const graph = buildGraph(splitWalls);
  // ... resten oförändrat
}
```

### Också: snappa till vägg-midpunkt vid ritning

**`src/components/build/BuildCanvas2D.tsx`** och **`src/components/build/BuildScene3D.tsx`**:

Utöka snap-logiken: om `snapToNode` inte hittar en endpoint, testa om positionen är nära mitten av ett befintligt väggsegment. Om ja → snappa till den närmaste punkten på väggen OCH splitta den väggen automatiskt.

```typescript
// Efter snapToNode misslyckas, testa vägg-midpunkt
if (!nodeSnap.isSnapped) {
  const wallHit = findWallAtWorld(snapped[0], snapped[1], floorWalls, 0.25);
  if (wallHit) {
    // Projicera till närmaste punkt på väggen
    // Splitta väggen vid den punkten
    // Snappa till den exakta projektionspunkten
  }
}
```

### Ändrade filer
1. `src/lib/roomDetection.ts` — ny `splitAtTJunctions()`, anropas i `detectRooms()`
2. `src/components/build/BuildCanvas2D.tsx` — vägg-midpunkt-snap + auto-split vid ritning
3. `src/components/build/BuildScene3D.tsx` — samma vägg-midpunkt-snap i 3D

