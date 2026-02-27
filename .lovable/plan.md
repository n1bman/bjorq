

# Fix: Importerad modell syns inte i 3D-scenen

## Analys av koden

Jag har gått igenom hela pipeline:n och hittat flera problem:

### Problem 1: Ingen auto-skalning — modellen kan vara osynligt liten eller enorm
SketchUp exporterar OBJ i inches (1 inch = 0.0254 m). En modell som är 10 meter i verkligheten blir ~394 units i OBJ-filen. Med `scale: [1,1,1]` kan modellen vara hundratals gånger för stor eller liten. **Ingen bounding-box-normalisering görs.**

**Fix**: Efter laddning, beräkna bounding box och auto-skala till rimlig storlek (t.ex. max 20 meter). Spara den beräknade skalan i store.

### Problem 2: Base64-lagring spränger localStorage
`partialize` inkluderar `homeGeometry.imported.fileData` (base64). En 10 MB GLB → ~13 MB base64 → localStorage har ~5-10 MB gräns. `persist` kraschar tyst och INGET sparas — inklusive `source: 'imported'`. Vid nästa render läses `source: 'procedural'` och modellen försvinner.

**Fix**: Exkludera `fileData` från `partialize`, eller begränsa till max 4 MB. Större filer lagras bara som blob URL (försvinner vid reload men fungerar under session).

### Problem 3: GLB-export valideras inte
Om `exportToGLB` producerar en tom ArrayBuffer (160 bytes = tom GLB header), fångas det aldrig. Wizard visar "Klar!" med 0 trianglar.

**Fix**: Kontrollera GLB-storlek efter export. Om < 1 KB, kasta fel.

### Problem 4: Scenen centreras inte kring modellen
Kameran i 3D-scenen pekar på origo. Om modellen har offset (t.ex. center vid [100, 0, 200]) syns den inte i viewport.

**Fix**: Auto-centrera modellen till origo efter laddning.

## Ändringar

| Fil | Ändring |
|-----|---------|
| `src/lib/sketchupImport.ts` | Auto-centrera + auto-skala scen efter laddning, validera GLB-storlek |
| `src/store/useAppStore.ts` | Exkludera stora `fileData` från localStorage i `partialize` |
| `src/components/build/ImportedHome3D.tsx` | Logga vid rendering för debugging |
| `src/components/build/import/SketchUpWizard.tsx` | Visa bounding box info, hantera stora filer utan base64 |

### Detaljer

**sketchupImport.ts** — ny funktion `normalizeScene(scene)`:
- Beräkna `new THREE.Box3().setFromObject(scene)`
- Centrera scenen: `scene.position.sub(center)`
- Beräkna max dimension, skala ner om > 30 meter
- Logga bounding box, center, scale
- Returnera `{ appliedScale, boundingBox }` för att spara i store

**sketchupImport.ts** — validera GLB:
- Efter `exportToGLB`, om `glbBuffer.byteLength < 1024` → kasta fel "GLB-filen är tom"

**useAppStore.ts** — partialize fix:
- I `partialize`, exkludera `fileData` om den är större än 4 MB (behåll resten av homeGeometry)

**SketchUpWizard.tsx** — smart persistence:
- Om GLB > 4 MB, hoppa över `readAsDataURL` och sätt bara blob URL (fungerar under session)
- Visa varning: "Modellen är för stor för permanent lagring"

