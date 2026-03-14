

# Fix: KitchenFixture3D resolver-fel

## Problemet
Vite/Rollup har cachat ett felaktigt resolve-resultat för filnamnet `KitchenFixture3D`. Filen finns och har korrekt `export default`, men resolvern vägrar lösa den. Detta påverkar **både dev och produktion** — samma Rollup-resolver används i båda lägen.

Dessutom finns **två nästan identiska filer** (332 vs 323 rader) som skapar förvirring:
- `KitchenFixture3D.tsx` (332 rader) — "poisoned" i resolvern
- `KitchenFixtureObject3D.tsx` (323 rader) — fungerar

## Åtgärd

1. **Ta bort `KitchenFixture3D.tsx`** — den är poisoned och en duplikat
2. **Uppdatera `Scene3D.tsx` rad 18**: ändra import till `./build/KitchenFixtureObject3D`
3. **Uppdatera `BuildScene3D.tsx` rad 15**: ändra import till `./KitchenFixtureObject3D`

Tre filändringar, ingen logik påverkas.

