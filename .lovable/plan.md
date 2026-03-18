
Målet är att få GitHub Actions grönt igen och samtidigt behålla nya rummålningssystemet.

1) Verifierad rotorsak (från run-annoteringar)
- Nuvarande blockerare i CI är TypeScript-fel i:
  - `src/components/build/RoomWallSurfaces3D.tsx` rad 73–74
- Felet:
  - `Property 'position' does not exist on type 'WallOpening'`
- I `src/store/types.ts` har `WallOpening` fältet `offset` (inte `position`).

2) Kodändring (minimal och säker)
- Fil: `src/components/build/RoomWallSurfaces3D.tsx`
- I `generateClippedStrips(...)`, byt:
  - `op.position * wallLen`
  till
  - `op.offset * wallLen`
- Detta följer resten av kodbasen (`BuildCanvas2D`, `wallGeometry`, `wallFaces`, `buildUtils`) som redan använder `op.offset`.

3) Robusthet för äldre projektdata (rekommenderad)
- Lägg fallback i samma funktion så gamla exporter inte beter sig konstigt:
```ts
const normalizedOffset =
  typeof (op as any).offset === 'number'
    ? (op as any).offset
    : typeof (op as any).position === 'number'
      ? (op as any).position
      : 0.5;
const opT0 = normalizedOffset * wallLen - halfW;
const opT1 = normalizedOffset * wallLen + halfW;
```
- Viktigt: fallbacken ska inte referera `op.position` utan cast, annars kommer TS-felet tillbaka.

4) Kontrollera att tidigare “Could not resolve ./RoomWallSurfaces3D” inte återkommer
- Säkerställ att filen faktiskt finns i repo med exakt namn:
  - `src/components/build/RoomWallSurfaces3D.tsx`
- Importerna i:
  - `src/components/build/Walls3D.tsx`
  - `src/components/build/InteractiveWalls3D.tsx`
  ska fortsatt vara `./RoomWallSurfaces3D` (case-sensitive exakt).

5) Verifiering innan push
- Kör:
  - `npm run build`
  - `npm run build:dev`
- Bekräfta att inga nya TS-fel uppstår.

6) Förväntat resultat
- CI-jobben i länkarna slutar falla på `RoomWallSurfaces3D`.
- Nya rummålningsflödet (inre ytlager) är kvar.
- Direkt väggmålning fortsätter vara separerad från rummålning.

Teknisk not
- Felet är inte i Vite/alias eller import-systemet i sig, utan en ren typinkonsistens i ny komponent mot etablerad `WallOpening`-modell.
