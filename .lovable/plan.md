
Mål: fixa CI-felet utan att röra fungerande funktioner (rummålning/logik) mer än nödvändigt.

## Bekräftad rotorsak (efter genomgång av loggar + GitHub API)
1. CI-felen pekar på:
   - `Could not resolve "./RoomWallSurfaces3D" from "src/components/build/Walls3D.tsx"`.
2. `Walls3D.tsx` och `InteractiveWalls3D.tsx` på `main` importerar filen.
3. Själva filen finns **inte** i GitHub-repot på `main`:
   - `raw.githubusercontent.com/.../src/components/build/RoomWallSurfaces3D.tsx` => **404**.
   - Directory-listing via GitHub API för `src/components/build` saknar `RoomWallSurfaces3D.tsx`.
4. Senaste misslyckade commits (`d505...`, `2ec2...`, `da9c...`) ändrar endast `.lovable/plan.md`, inte koden.

Do I know what the issue is? **Ja**.  
Problemet är inte Vite i sig, utan att importerad fil saknas i committen som CI bygger.

## Isolerade filer
- `src/components/build/Walls3D.tsx` (importerar `./RoomWallSurfaces3D`)
- `src/components/build/InteractiveWalls3D.tsx` (importerar `./RoomWallSurfaces3D`)
- `src/components/build/RoomWallSurfaces3D.tsx` (**saknas på GitHub/main**, måste finnas i commit)
- (Verifiering) `src/store/types.ts` (`WallOpening.offset` är korrekt fält)

## Implementationsplan (minimal, utan regression)
1. **Skapa/återlägg exakt filen**
   - `src/components/build/RoomWallSurfaces3D.tsx`
   - Behåll nuvarande additive room-wall-lager (ingen ändring av fungerande vägg-/rumsflöde).
   - Behåll `offset`-baserad opening-logik med legacy fallback (`(op as any).position`) för gamla data.

2. **Rör inte fungerande delar**
   - Ingen ändring i affärslogik i:
     - `Walls3D.tsx`
     - `InteractiveWalls3D.tsx`
     - `useAppStore.ts`
   - Endast verifiera att importsträngen är exakt:
     - `./RoomWallSurfaces3D`
   - Filnamn måste vara exakt:
     - `RoomWallSurfaces3D.tsx` (case-sensitive).

3. **Byggverifiering lokalt i samma commit**
   - `npm run build`
   - `npm run build:dev`
   - Förväntan: resolve-felet försvinner helt.

4. **Remote-verifiering direkt efter push**
   - Kontrollera att raw-URL för filen inte längre ger 404.
   - Kontrollera att GitHub API listning för `src/components/build` nu innehåller filen.

5. **CI-verifiering**
   - Kör/re-run CI.
   - Förväntat: pipeline går förbi tidigare blockerare (`Could not resolve ...`).

## Tekniska detaljer (för implementation)
- Ingen aliasändring, inga workflowändringar krävs för själva fixen.
- Felet uppstår före TypeScript-kontroll (Rollup import resolution), därför måste filen finnas i committen.
- Om CI mot förmodan fortfarande visar samma fel efter att filen finns på raw-URL:
  - gör en ny “force commit” där både:
    - `RoomWallSurfaces3D.tsx` läggs till
    - och en minimal no-op ändring i `Walls3D.tsx` (t.ex. kommentar)
  - för att garantera att importör + importerad fil ligger i samma SHA.

## Säkerhets-/stabilitetsgaranti mot regressions
- Vi ändrar inte befintlig väggmålning, väggsegment, room-IDs, openings eller undo-flöde.
- Endast återställning av saknad modul som redan refereras av befintlig kod.
