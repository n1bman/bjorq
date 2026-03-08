

# Fix: Z-fighting / vägg- och texturflimmer

## Identifierade problem

### 1. Hörnblock överlappar väggsegment (HUVUDORSAK)
Väggar trimmas (miteras) vid anslutningar, men hörnblocket (`cornerBlocks`, rad 419-462) är en kub som överlappar väggändarna. Väggändytorna och hörnblockets sidor delar exakt samma plan → z-fighting.

### 2. Kamerans djupprecision
Canvas saknar `near`/`far` — Three.js default är `near: 0.1, far: 2000`. `far: 2000` är onödigt stort och slösar depth buffer-precision.

### 3. Terrain vs GroundPlane
Gräscirkel på `y=-0.01` med `polygonOffsetFactor: -0.5` och GroundPlane på `y=-0.02` med `polygonOffsetFactor: 1` — bara 0.01m apart. Motstridiga offset-riktningar kan orsaka flimmer vid låga kameravinklar.

### 4. Ceilings använder DoubleSide
`Ceilings3D` använder `side: DoubleSide` som shadow occluder. Inte nödvändigt — `BackSide` räcker för att blockera solljus uppifrån.

## Lösning

### `src/components/build/Walls3D.tsx`
- **Hörnblock**: Lägg till `polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1` på hörnblockens material så att de renderas framför väggytor vid överlapp
- **Väggmaterial**: Lägg till `polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1` i `createWallMaterials` (wallMaterials.ts) så att väggytor viker undan för hörnblock

### `src/lib/wallMaterials.ts`
- Sätt `polygonOffset` på väggmaterial med faktor 1 (push away) för att ge hörnblock prioritet

### `src/components/Scene3D.tsx`
- Kamera: lägg till `near: 0.1, far: 500` i Canvas camera-prop
- Terrain grass: öka separation till `y=-0.015` och använd `polygonOffsetFactor: -1` (starkare)

### `src/components/build/GroundPlane.tsx`
- Sänk till `y=-0.03` för bättre separation mot terrain

### `src/components/build/Ceilings3D.tsx`
- Byt `DoubleSide` till `BackSide` — occludern behöver bara blockera ljus uppifrån, inte rendera nedåt

## Filer

| Fil | Ändring |
|-----|--------|
| `src/lib/wallMaterials.ts` | polygonOffset på väggmaterial |
| `src/components/build/Walls3D.tsx` | polygonOffset på hörnblock |
| `src/components/Scene3D.tsx` | Kamera near/far, terrain y-separation |
| `src/components/build/GroundPlane.tsx` | Sänk y-position |
| `src/components/build/Ceilings3D.tsx` | BackSide istället för DoubleSide |

