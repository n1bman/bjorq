

# Fix: SketchUp-import producerar tom GLB (0 trianglar, 160 B)

## Rotorsak
Konverteringen "lyckas" men producerar en tom GLB. Troliga orsaker:

1. **GLTFExporter kan inte exportera MeshPhongMaterial** — OBJLoader och ColladaLoader skapar `MeshPhongMaterial`, men GLTFExporter i Three.js v0.170 kan ha problem med att konvertera dessa. Meshes hoppas över tyst.
2. **Texturer laddas aldrig** — `TextureLoader.load()` är asynkron men resultatet inväntas aldrig. Texturerna finns inte när GLTFExporter körs.
3. **Ingen validering** efter laddning — om scenen är tom märks det aldrig.

## Ändringar

### `src/lib/sketchupImport.ts`

**Fix 1: Konvertera material till MeshStandardMaterial före export**
Lägg till en `convertMaterials(scene)` funktion som traverserar scenen och byter ut alla `MeshPhongMaterial`/`MeshLambertMaterial` mot `MeshStandardMaterial` med samma färg/map. Detta garanterar att GLTFExporter kan exportera allt.

**Fix 2: Validera scenen efter laddning**
Efter `loadOBJ`/`loadDAE`, räkna meshes. Om 0 meshes: kasta ett tydligt fel istället för att producera en tom GLB.

**Fix 3: Gör texturladdning asynkron**
Byt `TextureLoader.load(url)` i `loadOBJ` mot en `await`-baserad laddning med promises, så texturerna faktiskt finns när vi exporterar.

**Fix 4: Logga scen-innehåll för debugging**
Lägg till `console.log` med mesh-count och material-typer efter laddning, så framtida problem syns i konsolen.

### Sammanfattning

| Ändring | Fil |
|---------|-----|
| Konvertera material till MeshStandardMaterial | `src/lib/sketchupImport.ts` |
| Validera mesh-count efter laddning | `src/lib/sketchupImport.ts` |
| Asynkron texturladdning | `src/lib/sketchupImport.ts` |
| Debug-logging | `src/lib/sketchupImport.ts` |

