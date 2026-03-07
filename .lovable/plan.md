

# Fix Plan: Build Errors + Home View Openings + Wall Corners + Import Issues

## Issues Summary

1. **Build error**: `BuildBottomDock` module cannot be resolved — file exists but needs a fresh write to register with Vite
2. **Walls transparent/see-through in build mode**: The `InteractiveWalls3D` mitering trims wall length but still renders opening segments using `origLength/origCx/origCz` — the mitered wall body has gaps where the trimmed ends were
3. **Doors/windows/garage-doors invisible in home view**: `Walls3D.tsx` (used by `Scene3D` in home mode) only renders wall segments around openings but never renders the actual door/window/garage-door 3D models (frames, glass, panels). `InteractiveWalls3D` has all that code but is only used in build mode
4. **Wall corners not merging** (images 3-5): The current mitering only trims half the *connected* wall's thickness from each end. For non-perpendicular angles or walls of equal thickness meeting, this creates visible gaps and overlaps. Need to also trim by half of the *current* wall's own thickness when both walls are the same thickness
5. **PDF floorplan import silently fails**: `handleFloorplan` does `URL.createObjectURL(file)` for PDFs, but PDFs can't be displayed as images. Need to render the PDF to a canvas image first
6. **Imported furniture fails to load**: Props use `URL.createObjectURL` which creates temporary blob URLs lost on refresh. The `loadGltf` function handles blob URLs via XHR, but base64 `fileData` stored in localStorage isn't being restored to a usable URL on page load

## File Changes

### 1. `src/components/build/BuildBottomDock.tsx` — Force re-write (fixes build error)
Re-write identical content to force Vite to pick up the module.

### 2. `src/components/build/Walls3D.tsx` — Add opening 3D models for home view
Port the door/window/garage-door rendering code from `InteractiveWalls3D` into `Walls3D`. Currently `Walls3D` only creates wall *segments* around openings but skips the actual 3D models (frames, glass, door panels). This is why openings are invisible in home/dashboard mode.

Key addition: After rendering wall segments for each opening, also render:
- Door frames + panels + handles
- Window frames + glass + sills
- Garage door sections + frame

This is a significant copy of rendering logic from `InteractiveWalls3D` lines 197-430.

### 3. `src/components/build/Walls3D.tsx` — Fix wall mitering for clean corners
Current mitering logic trims by `connectedThickness / 2`, but for walls of equal thickness meeting at corners, both walls trim by half the *other* wall's thickness — which equals their own half-thickness. The issue is at non-90° angles where box-based mitering creates visible gaps.

Fix: When two walls of equal thickness meet, trim each by `thickness / 2` (already done). For T-junctions, only the incoming wall trims. The real fix is ensuring the trim values don't create gaps — we need to check that the wall being trimmed actually needs it by verifying the connected wall truly shares that endpoint.

### 4. `src/components/build/BuildCatalogRow.tsx` — Fix PDF floorplan import
Add PDF-to-image conversion using an offscreen canvas. When a `.pdf` file is selected, use the browser's PDF rendering (via `pdf.js` would be ideal but heavy). Simpler approach: detect PDF files and show a toast that PDFs must be converted to PNG/JPG first, or use the `FileReader` + a basic canvas rasterization.

Practical fix: Accept only image files for floorplan (remove `.pdf` from accept), and add a separate PDF converter note. Or use the existing `document--parse_document` approach on the server side.

Simplest reliable fix: When file is `.pdf`, read it as a data URL and try to render it. Since browser PDF rendering via canvas is complex without pdf.js, we'll convert the accept to images only and show a helpful message.

### 5. `src/components/build/Props3D.tsx` — Fix furniture URL restoration
When the app reloads, blob URLs are invalidated. The store persists `fileData` (base64) but the component only uses `url`. Fix: In `PropModel`, check if the URL is a dead blob URL and fall back to reconstructing from `fileData` if available.

### 6. `src/components/build/InteractiveWalls3D.tsx` — Fix wall segment gap from mitering
The opening placement code uses `origLength/origCx/origCz` for positioning segments, which is correct. But the solid wall segments between openings use the mitered `length/cx/cz`. The issue: when mitering shortens the wall, the first/last wall segments near the endpoints get clipped, creating gaps at corners. Fix: Use `origLength` for opening-segment calculations but mitered dimensions only for the no-openings case.

## Priority Order
1. Fix build error (BuildBottomDock re-write)
2. Add opening models to Walls3D (home view doors/windows)
3. Fix wall corner gaps
4. Fix PDF import feedback
5. Fix furniture blob URL restoration

