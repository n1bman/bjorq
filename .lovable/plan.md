
Mål: få CI grönt genom att lösa den faktiska orsaken till `Could not resolve "./RoomWallSurfaces3D"`.

1) Bekräftad rotorsak
- `Walls3D.tsx` och `InteractiveWalls3D.tsx` importerar `./RoomWallSurfaces3D`.
- På GitHub `main` svarar `raw.githubusercontent.com/.../src/components/build/RoomWallSurfaces3D.tsx` med **404 Not Found**.
- Alltså: filen finns inte i den commit som Actions bygger, även om den finns i nuvarande Lovable-workspace.

2) Implementationsplan (det som ska göras i repo)
- Återskapa/commit:a `src/components/build/RoomWallSurfaces3D.tsx` i GitHub-repot (med den senaste implementationen för additive interior wall layer).
- Säkerställ exakt filnamn/case:
  - `RoomWallSurfaces3D.tsx` (stor R, W, S, D)
  - imports kvar som `./RoomWallSurfaces3D`.
- Behåll TypeScript-fix i komponenten:
  - använd `op.offset` (med legacy-fallback via cast om ni vill stödja gamla exports).
- Verifiera att inga referenser pekar på annan casing eller gammal sökväg.

3) Verifiering före/efter push
- Kör lokalt:
  - `npm run build`
  - `npm run build:dev`
- Kontrollera sedan GitHub direkt:
  - öppna raw-URL för filen och säkerställ att den inte längre är 404.
- Push ny commit och kör CI igen.

4) Om CI fortfarande klagar på samma resolve-fel
- Då är det inte kodinnehåll utan sync/commit-problem.
- Skapa en ny “force” commit som explicit inkluderar filen + en liten ändring i `Walls3D.tsx` (t.ex. kommentar) för att garantera att både importör och importerad fil hamnar i samma commit.

5) Fallback (endast om ni måste få pipeline grön direkt)
- Temporärt ta bort import + usage av `RoomWallSurfaces3D` i `Walls3D.tsx` och `InteractiveWalls3D.tsx`.
- Detta ger grön CI snabbt men stänger av rummålningens inre ytlager tills filen är korrekt återinförd.

Teknisk detalj
- Felet uppstår i Rollup-resolvern före typkontroll när importmålet saknas i arbetskopian på runnern.
- Därför hjälper inte TS-fixar om själva filen inte finns i GitHub-committen som byggs.
