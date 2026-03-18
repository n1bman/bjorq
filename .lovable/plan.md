
Mål: få CI grönt utan att ändra fungerande vägg-/rummålningslogik.

1) Bekräftad rotorsak (steg-för-steg)
- Actions-run `23259300947` bygger commit `f601857`.
- Den commiten innehåller bara:
  - `.lovable/plan.md`
  - `src/components/build/Walls3D.tsx`
- `src/components/build/RoomWallSurfaces3D.tsx` finns inte i GitHub `main` (raw-URL ger 404).
- Därför faller Vite/Rollup på:
  - `Could not resolve "./RoomWallSurfaces3D" from "Walls3D.tsx"`
- Browserslist-varningen är inte blockerande och ignoreras.

2) Minimal fix (utan regression)
- Återlägg **exakt** fil:
  - `src/components/build/RoomWallSurfaces3D.tsx`
- Behåll nuvarande funktionalitet oförändrad:
  - additive inre väggytor per rum
  - opening-klippning
  - `op.offset` + legacy-fallback `(op as any).position`
- Behåll importer i:
  - `Walls3D.tsx`
  - `InteractiveWalls3D.tsx`
  som `./RoomWallSurfaces3D` (exakt casing).

3) Sync-säkring i samma commit (för att undvika ny loop)
- I samma commit som filen återläggs:
  - gör en liten no-op ändring i `Walls3D.tsx` och `InteractiveWalls3D.tsx` (t.ex. kommentar/blankrad).
- Krav innan merge:
  - GitHub “Files changed” ska visa **3 filer**:
    1. `RoomWallSurfaces3D.tsx` (added)
    2. `Walls3D.tsx`
    3. `InteractiveWalls3D.tsx`

4) Verifieringsgate före/efter push
- Lokalt/Lovable:
  - `npm run build`
  - `npm run build:dev`
- GitHub direkt efter push:
  - kontrollera att raw-URL inte längre är 404:
    `https://raw.githubusercontent.com/n1bman/bjorq/main/src/components/build/RoomWallSurfaces3D.tsx`
  - kontrollera att `src/components/build` via GitHub API listar filen.
- Därefter re-run CI.

5) Om GitHub fortfarande tappar nya filer (kontingensplan utan funktionsändring)
- Undvik ny fil helt:
  - flytta samma RoomWallSurfaces3D-logik in i redan spårad fil (t.ex. inline i `Walls3D.tsx` + `InteractiveWalls3D.tsx`) och ta bort extern import.
- Detta ändrar inte beteende, men eliminerar beroendet av att en ny fil måste syncas.

Tekniska detaljer (sammanfattning)
- Felet sker i modulupplösning (Rollup) före TS-typkontroll.
- Därför hjälper inte typfixar om importmålet saknas i den commit Actions bygger.
- Vi rör inte store- eller geometri-logik som redan fungerar; endast modulnärvaro/sync säkras.
