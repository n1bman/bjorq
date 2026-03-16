

# Fix: Öppningar (dörrar/fönster) tappar miter-geometri — skapar glapp i hörn

## Rotorsak

Buggen är tydlig. Titta på de två kodvägarna i `generateWallSegments`:

**Utan öppningar** (rad 1016-1028): Använder `createMiteredWallGeometry` med miter-offsets → hörn ser bra ut.

**Med öppningar** (rad 1029-1066): Splittrar väggen i sub-sektioner med **vanlig `boxGeometry`** (rad 1048) — inga miter-offsets appliceras. Varje strip är en rak box. Hörnen förlorar sin gering helt.

```text
UTAN ÖPPNINGAR:              MED ÖPPNINGAR:
┌──────────────┐             ┌──┐ ┌─┐ ┌──┐
│  mitered geo │             │  │ │ │ │  │  ← vanliga boxar
│  (korrekt)   │             │  │ │ │ │  │     utan miter
└──────────────┘             └──┘ └─┘ └──┘
```

## Lösning

Applicera miter-offsets på **ytterändarna** av den första och sista vertikala strippen. Mellanliggande strips behöver inga miter-offsets (de är inuti väggen).

### Ändring: `src/lib/wallGeometry.tsx` — `wallSection`-hjälparen och strip-genereringen

1. **Utöka `wallSection`** med valfria miter-offsets för vänster/höger ände
2. **Första strippen** (börjar vid `-halfLen`): applicera `miter.fromLeft` / `miter.fromRight` på dess vänstra ände
3. **Sista strippen** (slutar vid `+halfLen`): applicera `miter.toLeft` / `miter.toRight` på dess högra ände
4. **Mellanstripper, headers, sills**: behåll som vanlig `boxGeometry`

Konkret: skapa en ny variant av `wallSection` som använder `createMiteredWallGeometry` med partiell miter (bara ena änden) för ändstrips, medan mittensektioner fortsätter använda vanlig box.

```typescript
// Ny helper för ändstripper med miter
const wallSectionMitered = (key, localLeft, localRight, centerY, h, stripMiter) => {
  const w = localRight - localLeft;
  const localCenterX = (localLeft + localRight) / 2;
  const geo = createMiteredWallGeometry(w, h, wall.thickness, stripMiter);
  const pos = new THREE.Vector3(localCenterX, 0, 0)
    .applyAxisAngle(...)
    .add(...);
  return <mesh key={key} geometry={geo} material={mats} position={...} rotation={...} />;
};

// Vid strip-generering:
// Om strip börjar vid -halfLen → stripMiter.fromLeft/Right = miter.fromLeft/Right
// Om strip slutar vid +halfLen → stripMiter.toLeft/Right = miter.toLeft/Right
// Annars → alla offsets = 0
```

En fil, en funktion utökad. Headers och sills behöver inte miter (de är inuti väggen). Bara de yttersta vertikala stripperna vid hörnen.

