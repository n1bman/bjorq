

# Fix: SketchUp Import — 0 Meshes Root Cause

## Analysis

The current code has these critical flaws:

1. **`buildTextureMap` is too limited** — only maps image basenames, ignoring path variations like `./textures/wood.jpg`, URL-encoded names, backslashes, etc. OBJ/DAE loaders can't resolve references.

2. **OBJ loader has no `LoadingManager`** — texture resolution is done manually after MTL parse, but the MTL loader itself has no URL modifier. If it tries to fetch textures during `preload()`, it hits dead URLs.

3. **DAE loader passes `''` as resource path** — `ColladaLoader.parse(daeText, '')` means all relative resource paths resolve against nothing. The `setURLModifier` partially helps but the empty base path can cause parse failures.

4. **No comprehensive blob URL map** — files extracted from ZIP are stored by their clean path but never mapped to blob URLs for the Three.js loading infrastructure.

5. **Multiple file selection defaults to first, not largest** — `validation.mainFile = objFiles[0]` picks alphabetically first, not the actual model file.

## Changes

### `src/lib/sketchupImport.ts`

**Replace `buildTextureMap` with `buildBlobUrlMap`**:
- Create blob URLs for ALL extracted files (not just images)
- Map each file under multiple normalized keys: full path, basename, lowercase, URL-decoded, backslash variants, with/without `./` prefix
- Return both the blob URL map and a list of created URLs (for cleanup)

**Rewrite `loadOBJ`**:
- Accept the full `blobUrlMap` instead of `textureMap`
- Create a `THREE.LoadingManager` with `setURLModifier` that resolves from the blobUrlMap
- Pass the manager to both `MTLLoader` and `OBJLoader`
- Remove manual texture assignment — let the loaders resolve via the URL modifier

**Rewrite `loadDAE`**:
- Accept the full `blobUrlMap`
- Pass a proper base path (blob URL of the DAE file's directory) to `ColladaLoader.parse()`
- Use `setURLModifier` on the manager to resolve all resource references

**Update `validateFileMap`**:
- When multiple OBJ/DAE files exist, default to the largest by file size (not first alphabetically)

**Track missing resources**:
- The `setURLModifier` callback should collect unresolved URLs into a `missingResources` list
- Return this list alongside warnings from `convertSketchUp`

**Update `convertSketchUp` signature**:
- Build blobUrlMap at start, pass to loaders
- Clean up blob URLs at end
- Return `missingResources` in the result

### `src/components/build/import/SketchUpWizard.tsx`

**Add debug panel in `validate` and `done` steps**:
- Collapsible section showing:
  - Files found: count of .obj, .mtl, .dae, textures
  - Chosen main file name
  - After conversion: root type, children count, mesh count, triangle count, bounding box, missing resources list

**Update `ConversionResult` type** to include `debugInfo`:
```text
debugInfo: {
  rootType: string
  childrenCount: number
  meshCount: number
  triangleCount: number
  boundingBox: { x, y, z }
  missingResources: string[]
}
```

### `src/lib/sketchupImport.ts` — types

Add to `ConversionResult`:
- `debugInfo` object with mesh/tri/bbox/missing resources

Add to `ValidationResult`:
- `fileSizes` map for OBJ picker sort

## File summary

| File | Change |
|------|--------|
| `src/lib/sketchupImport.ts` | Replace texture-only map with full blobUrlMap, LoadingManager for both loaders, largest-file default, missing resource tracking, debugInfo in result |
| `src/components/build/import/SketchUpWizard.tsx` | Add collapsible debug panel showing file counts, mesh/tri stats, missing resources |

