

# Plan: 5 förbättringar för byggläget

## 1. Dörrspråk — öppning direkt på vägg
Funktionen finns redan: välj en vägg med select-verktyget → inspektören visar knappar "Dörr" och "Fönster" under "Öppningar". Men det är inte uppenbart. **Förbättring**: Gör det möjligt att klicka direkt på en vägg med dörr/fönster-verktyget aktivt (istället för att behöva välja väggen först med select). När man klickar med dörr/fönster/garage-verktyget på en vägg i 3D eller 2D, skapas en öppning vid klickpunkten automatiskt.

**Filer**: `BuildCanvas2D.tsx` (2D-klick med dörr/fönster-verktyg → hitta närmaste vägg, beräkna offset, lägg till öppning), `InteractiveWalls3D.tsx` (3D-klick med dessa verktyg).

## 2. Rum och golv — automatisk detektering vid väggändring
Problemet: väggar ritade manuellt skapar inte rum/golv automatiskt. Auto-detect körs bara vid knapp-klick. **Förbättring**: Lägg till automatisk rumsdetektering (debounced) efter varje väggändring, eller visa tydligare en prompt att använda "Rum"-verktyget (rektangel-drag) eller "Detektera"-knappen.

**Filer**: `useAppStore.ts` — efter `addWall`/`deleteWall`/`updateWall` → kör `detectRooms` automatiskt (debounced). Alternativt visa en toast-notis "Klicka Detektera rum" efter att väggar ritats.

## 3. Vägg-hörn — fyll öppna fyrkanter med hörnblock
Nuvarande mitering trimmar väggar inåt vid korsningar men lämnar synliga luckor i hörnen. **Fix**: Lägg till hörnblock (corner fill) meshes vid varje nod där 2+ väggar möts. Ett litet kubiskt block med väggens tjocklek × tjocklek × full höjd placeras i noden.

**Filer**: `Walls3D.tsx` och `InteractiveWalls3D.tsx` — efter wall-loopen, iterera alla unika nod-positioner med 2+ anslutningar och rendera en `boxGeometry` hörnblock.

## 4. Fönster/dörr inside/outside flip
Lägg till en `flipped: boolean`-property på `WallOpening` som inverterar vilken sida som räknas som in- respektive utsida. I inspektören visas en toggle "Vänd in/ut".

**Filer**:
- `store/types.ts` — lägg till `flipped?: boolean` på `WallOpening`
- `BuildInspector.tsx` — toggle-knapp i OpeningInspector
- `InteractiveWalls3D.tsx` + `Walls3D.tsx` — vid rendering, om `flipped`, spegla z-offset för karmar/paneler

## 5. Vägghöjd-presets (låg/mellan/hög)
Lägg till tre snabbknappar i WallInspector: Låg (0.9m), Mellan (1.2m), Hög (2.5m/full). Plus en slider för fritext.

**Filer**: `BuildInspector.tsx` — lägg till höjdval-knappar i WallInspector som anropar `updateWall(floorId, wallId, { height: X })`.

---

### Prioriteringsordning
1. Hörn-fix (3) — mest visuellt störande
2. Rum-autodetekt (2) — kritiskt för golv
3. Direkt-placera öppningar (1) — UX-förbättring  
4. Vägghöjd-presets (5) — enkel tillägg
5. Flip inside/outside (4) — property + UI

