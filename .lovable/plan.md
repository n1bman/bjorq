

# Fix: OBJ Loading Fails Silently for Large Files

## Root Cause
Line 476 in `src/lib/sketchupImport.ts`: `const objText = await objBlob.text()` — for a 600MB OBJ file, `Blob.text()` can silently fail or produce a truncated string, causing `OBJLoader.parse()` to return an empty Group.

## Changes — `src/lib/sketchupImport.ts` only

### 1. Replace `text()` with `ArrayBuffer` + `TextDecoder` in `loadOBJ` (line 476)
```typescript
// Replace:
const objText = await objBlob.text();

// With:
const buffer = await objBlob.arrayBuffer();
const objText = new TextDecoder().decode(buffer);
console.log(`[SketchUp Import] OBJ file size: ${buffer.byteLength}, text length: ${objText.length}`);
```

### 2. Add mesh validation after parse (after line 501)
After `objLoader.parse(objText)`, validate immediately:
```typescript
const group = objLoader.parse(objText);
const { meshCount, triCount } = collectSceneStats(group);
console.log(`[SketchUp Import] OBJ parsed: ${group.children.length} children, ${meshCount} meshes, ${triCount} triangles`);

if (meshCount === 0) {
  // Log first 200 chars of OBJ for debugging
  console.error(`[SketchUp Import] OBJ text preview: ${objText.substring(0, 200)}`);
  throw new Error(`OBJ loaded but 0 meshes found. File size: ${buffer.byteLength}, text length: ${objText.length}. OBJ parsing failed.`);
}

const box = new THREE.Box3().setFromObject(group);
console.log(`[SketchUp Import] OBJ bounding box:`, box);
if (box.isEmpty()) {
  throw new Error('OBJ model bounding box is empty');
}
```

### 3. Same fix for MTL loading (line 486)
Replace MTL `text()` with ArrayBuffer approach:
```typescript
const mtlBuffer = await mtlBlob.arrayBuffer();
const mtlText = new TextDecoder().decode(mtlBuffer);
```

### 4. Same fix for DAE loading (line 515)
Replace DAE `text()` with ArrayBuffer approach:
```typescript
const daeBuffer = await daeBlob.arrayBuffer();
const daeText = new TextDecoder().decode(daeBuffer);
```

### 5. Add "SketchUp Fast Import" mode
Add optional `fastMode` parameter to `loadOBJ`. When true:
- Skip MTL loading entirely
- After parse, assign a simple `MeshStandardMaterial({ color: 0xcccccc })` to all meshes
- This isolates geometry loading from texture/material issues

Update `loadOBJ` signature:
```typescript
async function loadOBJ(
  files, objPath, mtlPath, blobUrlMap, missingResources, warnings,
  fastMode = false
): Promise<THREE.Group>
```

When `fastMode`:
- Skip MTL parsing block
- After parse, traverse and assign default material

### 6. Same fix in `testLoadOnly` (line 685)
Pass `fastMode` option through so the diagnostic button can test with/without textures.

### 7. Add `fastMode` checkbox to SketchUpWizard.tsx
In the `validate` step, add a Switch labeled "SketchUp Fast Import (geometri utan texturer)" that sets a `fastMode` state. Pass it through to `convertSketchUp` and `testLoadOnly`.

| File | Change |
|------|--------|
| `src/lib/sketchupImport.ts` | ArrayBuffer loading for OBJ/MTL/DAE, mesh validation, fast import mode |
| `src/components/build/import/SketchUpWizard.tsx` | Add fast import toggle, pass to conversion |

