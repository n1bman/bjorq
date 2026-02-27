

# Debug: SketchUp Import — Find Where 0 Meshes Happens

The current code already uses `objLoader.parse(text)` and `LoadingManager` with `setURLModifier`. Yet we get 0 meshes. We need hard diagnostic proof.

## Changes

### `src/components/build/import/SketchUpWizard.tsx`

**A) Add "Test GLB Export (Box)" button** in the `validate` step:
- Creates a `THREE.Mesh(new BoxGeometry(1,1,1), new MeshStandardMaterial({color: 0xff0000}))`
- Exports with `GLTFExporter` (binary)
- Loads back via `GLTFLoader` and counts triangles
- Shows result on-screen (pass/fail + triangle count)

**B) Add "Verify Loader" step** — after ZIP extraction + validation, before conversion:
- New button "Testa laddning" in the `validate` step
- Calls a new exported function `testLoadOnly(fileMap, validation, selectedObj)` from `sketchupImport.ts`
- Shows on-screen debug summary: chosen file name+size, root children, mesh count, tri count, bbox, material types, missing resources
- This runs WITHOUT export — just load + count

**C) Show loader test results inline** in a new `LoaderTestPanel` component below the file debug panel

### `src/lib/sketchupImport.ts`

**Export new `testLoadOnly` function**:
- Builds blobUrlMap
- Loads OBJ or DAE (same code path as `convertSketchUp`)
- Does NOT export to GLB
- Returns a `LoaderTestResult` with: mainFile, mainFileSize, rootType, childrenCount, meshCount, triCount, boundingBox, materialTypes[], childTree (first 2 levels), missingResources[]
- Cleans up blob URLs

**Export new `testGLBExportSanity` function**:
- Creates box mesh → exports GLB → returns { success, byteLength, error? }

**Add child tree dump** to help debug empty scenes:
- Walk first 2 levels of children, collect `{ name, type, childCount }` for each

### New type: `LoaderTestResult`

```text
{
  mainFile: string
  mainFileSize: number
  rootType: string
  childrenCount: number
  meshCount: number
  triCount: number
  boundingBox: { x, y, z }
  materialTypes: string[]
  childTree: { name: string, type: string, children: number }[]
  missingResources: string[]
}
```

## File summary

| File | Change |
|------|--------|
| `src/lib/sketchupImport.ts` | Add `testLoadOnly()`, `testGLBExportSanity()`, `LoaderTestResult` type |
| `src/components/build/import/SketchUpWizard.tsx` | Add "Test GLB Export" button, "Testa laddning" button, `LoaderTestPanel` component |

