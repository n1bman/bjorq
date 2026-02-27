

# Plan: SketchUp Import (ZIP/Folder) → Optimized GLB

## Overview
Add a new import path in Build → Importera that accepts SketchUp exports (OBJ/MTL/textures or DAE) via ZIP or folder upload, converts them client-side to GLB using Three.js loaders/exporter, applies texture optimization, and feeds the result into the existing GLB import pipeline.

## Dependencies to Add
- **fflate** — lightweight ZIP parsing (< 30KB, no dependencies, works in browser)

## New Files

### `src/lib/sketchupImport.ts` — Core conversion pipeline
- Extract ZIP using fflate, or process folder FileList
- Detect format: find `.obj`+`.mtl` or `.dae` files (prefer DAE if both exist)
- Build a virtual file map `Record<string, Blob>` for texture resolution
- Load with Three.js `OBJLoader`+`MTLLoader` or `ColladaLoader`, using custom texture resolver for case-insensitive/subfolder matching
- Apply optimization pass:
  - Traverse scene, downscale textures to canvas (max 1024px tablet / 2048px desktop)
  - Convert TIFF textures to JPEG via canvas
  - Deduplicate materials
- Export via `GLTFExporter` to binary GLB ArrayBuffer
- Run existing `analyzeModel()` for performance stats
- Return `{ glbBlob, stats, originalSize, optimizedSize }`

### `src/components/build/import/SketchUpWizard.tsx` — Step wizard UI
- Step 1: Choose ZIP or Folder → file picker
- Step 2: Validate contents (show detected files, errors for missing MTL/textures)
- Step 3: Target device toggle (Tablet/Desktop), show analysis preview
- Step 4: Converting... (progress bar with stages: extracting → loading → optimizing → exporting)
- Step 5: Done — show before/after stats, auto-import into scene
- Uses existing `Progress` component and styling patterns
- On completion, calls existing `setImportedModel()` + `setHomeGeometrySource('imported')` — same as current GLB flow

## Modified Files

### `src/components/build/import/ImportTools.tsx`
- Add a second upload button below the existing GLB button: "Ladda upp SketchUp (ZIP / Mapp)"
- Clicking it opens `SketchUpWizard` in a Dialog overlay
- No changes to existing GLB upload logic

### `src/store/types.ts`
- Add `originalSize?: number` and `optimizedSize?: number` to `ImportedHomeSettings` (for display in stats panel)

### `src/store/useAppStore.ts`
- No action changes needed — existing `setImportedModel` already accepts partial updates

## Technical Details

### ZIP Handling (fflate)
```typescript
import { unzipSync } from 'fflate';
const files = unzipSync(new Uint8Array(arrayBuffer));
// Returns Record<string, Uint8Array>
```

### Folder Upload
```html
<input type="file" webkitdirectory="" multiple />
```
Read all files into a `Map<string, Blob>` keyed by relative path.

### Texture Resolution
- Build lookup map of all image files (jpg/png/tif/webp) by basename (case-insensitive)
- When MTL references `textures/Wood_Floor.jpg`, search map for matching basename
- For TIFF: draw to canvas → export as JPEG

### Texture Downscaling
```typescript
function downscaleTexture(image: HTMLImageElement, maxSize: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = image.width * scale;
  canvas.height = image.height * scale;
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}
```

### GLB Export
```typescript
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
const exporter = new GLTFExporter();
const glb = await exporter.parseAsync(scene, { binary: true });
```

### Error Handling
- Missing MTL → warning, import OBJ without materials
- Missing textures → list missing files, continue with placeholder color
- Multiple OBJ files → show picker dialog
- TIFF conversion failure → skip texture, warn

## What stays unchanged
- Existing GLB/GLTF import button and flow
- Build mode logic, widgets, HA integration, device placement
- Store structure (additive fields only)
- ImportedHome3D rendering component
- Performance settings system

