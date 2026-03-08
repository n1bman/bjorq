

# Fix: 3D-modell button → Dialog popup instead of duplicate side panel

## Problem
"Välj GLB/GLTF" upload button appears both in the bottom catalog row (via `ImportCatalog`) AND in the left side panel (`ImportTools`). User wants: clicking "3D-modell" in the bottom bar opens a **popup dialog** with the upload button, and after import shows model stats inline in that dialog. The side panel should only show transformation controls (position/rotation/scale/etc.) once a model is loaded.

## Changes

### 1. `src/components/build/BuildModeV2.tsx` — ImportCatalog "3D-modell" button
- Instead of directly triggering a file input, clicking "3D-modell" opens a **Dialog** (using existing Radix dialog component)
- Dialog contains: upload dropzone ("Välj GLB/GLTF"), and if a model is already loaded, shows the model stats panel (triangles, materials, textures, rating)
- "Planritning" button stays as-is (direct file picker — simple and correct)

### 2. `src/components/build/import/ImportTools.tsx` — Remove upload button
- Remove the "Ladda upp modell" upload section from the side panel (it's now in the dialog)
- Remove the model stats display from the side panel (moved to dialog)
- Keep only: position, rotation, scale, north angle, sunlight transparency, remove button — these only show when `isImported`

### 3. `src/components/build/BuildModeV2.tsx` — Side panel visibility
- Only show the ImportTools side panel when `isImported` is true (i.e. a model is loaded), since there's nothing useful to show in the panel before import

## UX Flow
```text
1. User clicks "Import" tab → bottom bar shows "Planritning" + "3D-modell"
2. User clicks "3D-modell" → Dialog opens with upload button
3. User uploads GLB → Dialog shows model stats (triangles, rating, etc.)
4. User closes dialog → Side panel appears with position/rotation/scale controls
5. User can re-open dialog via "3D-modell" to see stats or upload a new model
```

## Files
- `src/components/build/BuildModeV2.tsx` — modify `ImportCatalog` to use Dialog for 3D-modell
- `src/components/build/import/ImportTools.tsx` — remove upload + stats sections, keep transform controls only
- `src/components/build/BuildModeV2.tsx` — condition side panel on `isImported`

