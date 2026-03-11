

# Prop Drag i Möbler-fliken + Wizard-cleanup + Högerklick-block + v1.0.8

## 1. Tillat flytt av props i Möbler-fliken (utan att byta till Välj)

**Props3D.tsx** (rad 208-215):
- `handleClick`: Tillåt markering även när `activeTool === 'furnish'`
- `handlePointerDown`: Tillåt drag även när `activeTool === 'furnish'` (ta bort kravet på `activeTool !== 'select'` för furnish)

**BuildCanvas2D.tsx** (rad 708-717):
- I `handlePointerDown`, lägg till en block för `activeTool === 'furnish'` som kör samma prop/device-selektion och drag-logik som `'select'` (opening, device, node, prop, wall — åtminstone prop och device)

## 2. Blockera högerklick på enhetsmarkörer (DeviceMarkers3D.tsx)

Enhetsmarkörerna saknar `onContextMenu`-blockering. Alla marker-komponenter (LightMarker, SwitchMarker, etc.) använder `<group ... onClick={handleClick} onPointerDown={handlePointerDown}>`.

Enklaste lösningen: I den yttre `<group>` i render-loopen (rad ~1327) som wrappar alla markers, lägg till `onContextMenu={(e) => { e.nativeEvent?.preventDefault?.(); e.stopPropagation(); }}`.

## 3. Wizard-flik: ta bort Importera-knapp och käll-/kategorifilter

När `sourceFilter === 'wizard'`, dölj:
- "Importera"-knappen (dashed border upload button) — rad ~664, ~690, ~694
- Käll-filter-knapparna (Alla/Katalog/Mina/Wizard) — rad ~536-544 (redan filtrerat via `initialSourceFilter`)
- Kategorifilter — rad ~546-554 (wizard-modeller har sina egna kategorier men de behövs inte här)

Villkor: `sourceFilter === 'wizard'` → dölj dessa UI-element.

## 4. Wizard-ikon på importerade möbler

I `renderCard`, för entries med `wizardMode === 'imported'`, visa en liten `Wand2`-ikon (10px, orange) i hörnet:
- Grid-vy: absolut positionerad top-right (men under staleSync-ikonen)
- List-vy: bredvid namnet

## 5. Version 1.0.8

Uppdatera version i:
- `package.json` (1.0.7 → 1.0.8)
- `server/package.json` (1.0.7 → 1.0.8)  
- `bjorq_dashboard/config.yaml` (1.0.7 → 1.0.8)
- `server/api/backups.js` (APP_VERSION)
- `README.md` badge (1.0.2 → 1.0.8)
- `bjorq_dashboard/README.md` badge (1.0.2 → 1.0.8)
- `CHANGELOG.md` (ny [1.0.8] sektion)

## Filer som ändras

| Fil | Ändring |
|-----|--------|
| `Props3D.tsx` | Tillåt select+drag vid `furnish` |
| `BuildCanvas2D.tsx` | Tillåt prop select+drag vid `furnish` |
| `DeviceMarkers3D.tsx` | Block onContextMenu |
| `BuildModeV2.tsx` | Dölj import/filter i wizard-vy, wizard-ikon på importerade |
| `package.json` | 1.0.8 |
| `server/package.json` | 1.0.8 |
| `bjorq_dashboard/config.yaml` | 1.0.8 |
| `server/api/backups.js` | 1.0.8 |
| `README.md` | Badge 1.0.8 |
| `bjorq_dashboard/README.md` | Badge 1.0.8 |
| `CHANGELOG.md` | Ny sektion |

