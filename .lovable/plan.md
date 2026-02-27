

# Fix: Radera allt, SketchUp-import, och ta bort uppladdad modell

## Problem 1: "Radera allt" funkar inte
`clearAllFloors()` rensar väggar/rum/trappor och props men rensar INTE den importerade modellen. Om `homeGeometry.source === 'imported'` så syns modellen fortfarande. Knappen ska också rensa importerad modell och återställa till procedurellt.

### Fix: `src/store/useAppStore.ts`
- I `clearAllFloors` action: lägg till att återställa `homeGeometry.source` till `'procedural'` och rensa `homeGeometry.imported` (url, fileData, modelStats etc.)

## Problem 2: ZIP-import visar inte filer
ZIP-filväljaren i `SketchUpWizard.tsx` har `accept=".zip"` — detta borde fungera. Men problemet kan vara att `unzipSync` från fflate kraschar tyst, eller att `extractZip` returnerar tomt. Behöver lägga till bättre error handling och loggar. Dessutom: wizardens dialog kanske blockeras av andra UI-element.

### Fix: `src/components/build/import/SketchUpWizard.tsx`
- Lägg till `console.log` i `handleZip` för att debugga
- Se till att ZIP-dialogen har tillräckligt hög `z-index` (DialogContent)
- Kontrollera att `extractZip` hanterar edge cases (tom ZIP, nested mappar)

### Fix: `src/lib/sketchupImport.ts`  
- I `extractZip`: strip leading directory prefix (SketchUp ZIP-filer har ofta en rot-mapp som `model/file.obj`) — filerna hittas inte om man söker efter `file.obj` men de ligger under `model/file.obj`

## Problem 3: Saknar "Ta bort uppladdad modell"-knapp
Det finns ingen knapp för att ta bort en importerad modell. Användaren måste byta till "procedurellt byggande" men det är inte tydligt.

### Fix: `src/components/build/import/ImportTools.tsx`
- Lägg till en tydlig röd "Ta bort modell"-knapp bredvid/under modellinfo när en modell är importerad
- Knappen ska rensa `imported` (url, fileData, modelStats) och sätta source till `'procedural'`

### Fix: `src/store/types.ts` + `src/store/useAppStore.ts`
- Lägg till `clearImportedModel` action som rensar alla imported-fält och sätter source till `'procedural'`

## Sammanfattning av ändringar

| Fil | Ändring |
|-----|---------|
| `src/store/types.ts` | Lägg till `clearImportedModel` action-typ |
| `src/store/useAppStore.ts` | Implementera `clearImportedModel`, uppdatera `clearAllFloors` att även rensa importerad modell |
| `src/components/build/import/ImportTools.tsx` | Lägg till "Ta bort modell"-knapp med bekräftelse |
| `src/components/build/import/SketchUpWizard.tsx` | Förbättra error handling i ZIP-hantering |
| `src/lib/sketchupImport.ts` | Hantera nested mappar i ZIP (strip common prefix) |

