
Målet: göra golvskalning tydligt märkbar genom finjustering med två sliders (Skala + Rotation) direkt under Auto/Liten/Standard/Stor i Måla-panelen.

1) Problem jag utgår från
- Nuvarande size mode är ett grovt preset-lager, men visuellt blir skillnaden liten på vissa texturer.
- Du behöver manuell kontroll per rum/material för att snabbt se tydlig skillnad.

2) Lösning (UX)
- Behåll knapparna: Auto, Liten, Standard, Stor (snabbval/preset).
- Lägg till två sliders under dem:
  - Skala (t.ex. 0.2x–4.0x, default 1.0x)
  - Rotation (0°–360°, default 0°)
- Sliders ska vara per rum (så Rum 5 kan ha annan skala/rotation än Rum 2).
- Visning av livevärde bredvid slider (ex: 1.35x, 27°).

3) Tekniska detaljer
- Datamodell:
  - `src/store/types.ts` → `Room` får:
    - `floorTextureScale?: number` (default 1)
    - `floorTextureRotation?: number` (default 0)
- UI (rätt panel, alltså inlinade SurfaceEditor):
  - `src/components/build/BuildModeV2.tsx`
  - Under befintliga size mode-knappar läggs två sliders.
  - Uppdatera endast valt rum i aktivt våningsplan.
  - Undo-hantering: undvik undo-spam genom att pusha undo 1 gång per slider-drag (inte varje tick).
- Render/texture engine:
  - `src/lib/wallTextureLoader.ts`
  - Utöka `applyFloorTextures`/`applyMaterialTextures` med floor-overrides:
    - extra scale-multiplikator
    - rotation i grader
  - Säkerställ att `map`, `normalMap`, `roughnessMap`, `aoMap` får samma rotation.
  - Cache-nyckel måste inkludera rotation + repeat så olika rum inte “läcker” samma transform.
- 3D-koppling:
  - `src/components/build/Floors3D.tsx`
  - Läs `room.floorTextureScale` + `room.floorTextureRotation` och skicka till `applyFloorTextures`.
  - Säkerställ att memo/dependencies triggar om-render när dessa värden ändras.

4) Beteende efter ändring
- Auto/Liten/Standard/Stor fortsätter vara snabbpresets.
- Skala-slider finjusterar ovanpå preset (preset + finlir).
- Rotation-slider roterar mönstret direkt i golvytan så ådring/kakelriktning kan matchas visuellt.
- Skillnaden blir tydlig även i rum runt 14 m² eftersom man får större spann och kontinuerlig kontroll.

5) Verifiering (acceptanskriterier)
- När Skala ändras i valt rum syns omedelbar förändring i repetition/täthet.
- När Rotation ändras roterar mönstret visuellt (inte bara färg).
- Byte mellan rum behåller unika slider-värden per rum.
- Undo återställer senaste slider-justering korrekt utan hundratals steg.
- Väggmaterialflödet påverkas inte.

6) Implementationsordning
1. Lägg till room-fält i `types.ts`
2. Lägg till sliders i `BuildModeV2.tsx` under size mode
3. Koppla state-uppdatering per rum + robust undo
4. Utöka texture loader med scale/rotation-overrides och cache-key
5. Tråda in overrides i `Floors3D.tsx`
6. Snabb validering i preview: samma rum, samma material, testa Auto vs slider-extremer + rotation 0/90/180
