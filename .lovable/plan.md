

# Scenikon-färg synk + Projektgranskning + Release v1.10.0

## Del 1: Scenikon-färg synkas till alla vyer

`iconColor` sparas i `SavedScene` och renderas i `ScenesPanel` + `ScenesWidget`, men saknas i:

1. **`DashboardGrid.tsx` — `QuickScenesWidget`** (rad 150-192)
   - `allScenes`-mappen kopierar inte `iconColor` — lägg till `iconColor: s.iconColor`
   - Ikonens `<LIcon>` och fallback-ikonen saknar `style={{ color: scene.iconColor }}` — applicera om satt

2. **`RoomDetailPanel.tsx`** (rad 73-81)
   - Scenraden visar `<Play>` med `text-primary` istället för rätt scenikon med rätt färg
   - Ändra: läs scenikon via `iconMap`, applicera `style={{ color: sc.iconColor }}`

3. **`AutomationsPanel.tsx`** (rad 177)
   - Scenväljaren visar `{scene.icon} {scene.name}` som text — ingen ikon renderas
   - Mindre prioritet, men ikonnamnet bör bytas mot scennamnet enbart

## Del 2: Projektgranskning — identifierade problem

### localStorage quota exceeded (console-loggar)
- `Props3D.tsx` rad 145 anropar `updateProp` vid varje prop-uppdatering, triggar persist
- Store:n partialize:ar hela `props`-arrayen varje gång — med många props och texturer blir det >5MB
- **Fix:** Exkludera tunga fält från partialize, t.ex. strippa `props` model-data eller begränsa prop-serialisering

### Synk-problem
- `partialize` exkluderar `terrain` (träd, gräs) — inte synkat till localStorage
  - Kontrollera om `terrain` finns i partialize → om inte, lägg till (eller notera som känt)
- `widgetLayout` synkas via `homeView` — verifieras OK

### Prestanda
- `DashboardPreview3D` skapar sin egen `<Canvas>` → dubbel WebGL-kontext om den monteras samtidigt som `PersistentScene3D`
  - Notera som känd begränsning

## Del 3: Dokumentation + Release v1.10.0

### Version bump
- `package.json` → `1.10.0`
- `server/package.json` → `1.10.0`
- `bjorq_dashboard/config.yaml` → `1.10.0`

### Nya/uppdaterade filer
- `CHANGELOG.md` — ny [1.10.0]-post
- `docs/patchnotes-v1.10.0.md` — ny patchnotes
- `README.md` — version badge 1.10.0

### Patchnotes-innehåll (sammanfattning av allt sedan 1.9.1)
- Enhets-widgets som fria, individuella kort med inline-kontroller (vacuum, TV, speaker, light, climate, fan)
- Fritt positionerbart layoutläge med Anpassa/Markörer/Scener som draggables
- Scen-ikonsfärgväljare + synk till alla vyer
- Nordic Noir som default-tema
- Border-opacity-bugg fixad
- Drag-hopp vid första rörelsen fixat
- Återställ-knapp i layoutläge
- Safezone-varning
- LightMarkerLightOnly ljussynk fixad
- localStorage quota-hantering förbättrad

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/components/home/DashboardGrid.tsx` | Propagera iconColor till scenikoner |
| `src/components/home/cards/RoomDetailPanel.tsx` | Scenikon + iconColor istf. Play-ikon |
| `src/store/useAppStore.ts` | Strippa tunga prop-fält i partialize för att minska localStorage |
| `package.json` | Version → 1.10.0 |
| `server/package.json` | Version → 1.10.0 |
| `bjorq_dashboard/config.yaml` | Version → 1.10.0 |
| `CHANGELOG.md` | Ny [1.10.0]-sektion |
| `docs/patchnotes-v1.10.0.md` | Ny patchnotes-fil |
| `docs/patchnotes-next.md` | Rensa till "inga osläppta" |
| `README.md` | Badge → 1.10.0 |

