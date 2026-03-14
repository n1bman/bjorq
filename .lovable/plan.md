
Målet är att bryta fel-loopen permanent genom att sluta importera en separat köksfil från `Scene3D.tsx`, eftersom just den importkedjan fortsätter fallera i Vite/Rollup trots flera filnamnsbyten.

## Vad jag ser i koden nu
- `Scene3D.tsx` och `BuildScene3D.tsx` importerar `./build/ProceduralKitchen`.
- Flera parallella köksfiler finns kvar samtidigt:
  - `ProceduralKitchen.tsx`
  - `KitchenUnit3D.tsx`
  - `KitchenFixtureModel3D.tsx`
  - `KitchenFixtureObject3D.tsx`
  - `KitchenFixture3D.tsx`
- `BuildModeV2.tsx` har redan köket i biblioteket som inbyggd post (`builtin-standard-kitchen`) och anropar `addKitchenFixture` korrekt.

## Plan för fix (robust, enkel resolver-yta)
1. **Flytta köksrendering in i en redan stabil modul**  
   Lägg in kökskomponenten direkt i `src/components/build/Props3D.tsx` (samma logik som nu finns i `ProceduralKitchen.tsx`), så att inga separata kitchen-importer behövs från scenfilerna.

2. **Ta bort kitchen-import från scenfiler**
   - I `src/components/Scene3D.tsx`: ta bort `import ProceduralKitchen ...` och `<ProceduralKitchen />`.
   - I `src/components/build/BuildScene3D.tsx`: ta bort motsvarande import/rendering.
   Köket renderas istället via `Props3D` i båda vyerna.

3. **Städa gamla oanvända kitchen-filer helt**
   Ta bort:
   - `src/components/build/ProceduralKitchen.tsx`
   - `src/components/build/KitchenUnit3D.tsx`
   - `src/components/build/KitchenFixtureModel3D.tsx`
   - `src/components/build/KitchenFixtureObject3D.tsx`
   - `src/components/build/KitchenFixture3D.tsx`

4. **Behåll bibliotekskopplingen**
   Låt `BuildModeV2.tsx` vara kvar med `builtin-standard-kitchen` + `addKitchenFixture` (ingen ändring behövs där, endast verifiering).

5. **Verifiering**
   - Kör `npm run build:dev` och säkerställ att resolve-felet försvinner.
   - Funktionstest: placera “Standardkök 🍳” från biblioteket och kontrollera att det syns/kan väljas/flyttas/roteras i 3D.

## Tekniska detaljer (varför detta löser felet)
- Felet är ett **modulupplösningsfel på filnivå** (`Could not resolve "./build/ProceduralKitchen"`), inte ett runtime-fel i kökslogiken.
- Genom att **eliminera separat importpunkt** och lägga kökslogik i en fil som redan laddas stabilt (`Props3D.tsx`) minimeras risken för ytterligare resolver-problem.
- Att ta bort duplicerade/shim-filer förhindrar att gamla referenser eller cache-relaterade importvägar “läcker tillbaka”.
