

# Patch v1.6.2 — 7 Fixes + Version Bump

## Issues & Fixes

### 1. Media Screen lost 3D visual rendering
**Problem**: The `media_screen` device kind maps to `GenericMarker` (a plain sphere) in the `markerComponents` lookup table (line 1387 in DeviceMarkers3D.tsx). The `MediaScreenMarker` is only used in a special-case block further down — BUT the issue is the `markerComponents` entry is still hit for some code paths.

**Actual problem found**: The `MediaScreenMarker` IS being rendered (lines 1564-1578). The Canvas texture draws properly. Need to check if something in the rebuild broke the texture. Looking at the code, the texture uses `CanvasTexture` which should work. The `drawScreenCanvas` function is intact. The screen DOES render — it just might not be visible in dashboard preview because `DashboardPreview3D` uses its own lightweight canvas. The screen rendering requires `useFrame` for scanline animation, which works in PersistentScene3D but may not work well in the dashboard preview.

**Fix**: The media_screen entry in `markerComponents` (line 1387) returns `GenericMarker` — this is a fallback that shouldn't be reached since the special case on line 1565 catches it first. The actual issue is likely that the screen texture/canvas rendering is intact but not updating properly. Need to verify the flow is correct and ensure screens show their visual 3D plane (not just a sphere) in both main scene and dashboard preview.

After re-reading: The special case check on line 1565 `if (marker.kind === 'media_screen')` runs BEFORE the generic `markerComponents` fallback on line 1580. So the screen visual IS being rendered. The user says "denna enhet har tappat sin funktion med visuell 3D skärm" — this suggests something specific broke. Let me check if `DeviceMarkers3D` is properly included in `DashboardPreview3D`.

Looking at `DashboardPreview3D` — yes, it includes `<DeviceMarkers3D />` without `buildMode` prop, so screens should render. The issue might be that `useFrame` in `MediaScreenMarker` needs the canvas to be in focus. But `useFrame` works per-canvas, so the DashboardPreview3D canvas should have its own useFrame loop running.

The likely issue: `DashboardPreview3D` renders `<DeviceMarkers3D />` which creates a `CanvasTexture` — but the canvas element is created via `document.createElement('canvas')` and may work fine. Let me check if there's a missing import or a rendering issue. Actually the code looks correct. Perhaps the screen device just isn't placed yet, or the preview canvas's lower DPR/simpler rendering is hiding it. I'll ensure the media_screen rendering is fully functional by checking the flow end-to-end.

**Real fix needed**: In the `markerComponents` map (line 1387), `media_screen` maps to `GenericMarker`. This is redundant since the special case handles it, but let's make it explicit and clean. No actual bug here — the visual 3D screen works. The user might be seeing an issue in the dashboard view specifically. Will ensure proper rendering.

### 2. Cannot import 3D models in Bibliotek
**Problem**: The `handleBibFileSelect` function (line 1847) processes the file with `processModel`. Looking at the import flow: `validateFormat` → `processModel` → display analysis → confirm → `handleBibImportConfirm`. The flow reads correct in code.

**Likely issue**: The file input `ref` or dialog opening might be broken. The dialog is controlled by `bibImportOpen` state. Need to check if the "Import" button exists in the Bibliotek view and triggers `setBibImportOpen(true)`.

Let me check the Bibliotek tab rendering to find the import trigger button.

**Fix**: Need to find and verify the import trigger in the Bibliotek workspace. If it's missing, add it back.

### 3. Wall corners have cubes/gaps
**Problem**: The corner block generator (line 1148-1262) uses convex hull to fill corners. The images show dark cubes at corners and gaps. The issue is:
- The extruded corner block starts at `position={[pos[0], elevation, pos[1]]}` with `rotation={[-Math.PI / 2, 0, 0]}` — this positions the bottom of the extrusion at `y = elevation`. For a floor with `elevation = 0`, the block starts at ground level and goes UP. This is correct.
- BUT the height of the extrusion: `{ depth: height }` extrudes along the local Z axis (which after the -90° X rotation becomes the Y axis). So it extrudes from `elevation` to `elevation + height`. This seems correct.
- The dark cube appearance suggests the hull geometry is malformed or the material is wrong. The `dominantColor` comes from `wallColors[0]?.exteriorColor` — if walls have different colors, the first wall's color is used.

**Key problem**: The fallback square block (line 1249-1258) uses `position={[pos[0], height / 2 + elevation, pos[1]]}` with a `boxGeometry` centered on the position — this is correct. But the hull-based block uses `position={[pos[0], elevation, pos[1]]}` and extrudes UPWARD from that point. The visual mismatch (dark cube visible at corners) suggests the hull corners are being generated with incorrect geometry or the convex hull produces shapes that don't match the actual wall corners.

**Fix**: Improve the corner block generation:
1. Increase the hull's Z offset tolerance to avoid Z-fighting
2. Add slight scale padding to ensure corners fully seal
3. Fix the "heal walls" button functionality to ensure it works

### 4. Weather/sun synchronization between dashboard and design mode
**Both modes share the same store state** (`environment.sunAzimuth`, `environment.sunElevation`, `environment.weather`, etc.). The `SunWeatherPanel` component is used in `GraphicsCategory` (dashboard). In design mode, there's no separate weather panel found — design mode shares the same `UnifiedSceneContent` which reads the same environment profile.

**Fix**: These ARE synced already since they share the same Zustand store. The user wants more realistic sun positioning (closer to building, more game-like). Will:
- Reduce `dist` in sun position calculation from 20 to 12 for a closer, more dramatic sun
- Add clearer tooltips to calibration controls
- Ensure design mode has easy access to environment settings

### 5. Graphics settings working with new persistent 3D
The `GraphicsSettings` component modifies `performance` state which `PersistentScene3D` reads for quality, shadows, DPR, antialiasing, toneMapping, exposure. The Canvas uses a `key` that includes `recoveryCount` — but NOT quality/shadows changes. In the old system, changing quality triggered a Canvas remount.

**Fix**: Add quality/shadow/antialiasing/toneMapping to the Canvas key so changes trigger a full remount, as documented.

### 6. 3D view too large in Hem + camera save not persisting
The 3D preview in HomeCategory is `h-[280px]` — user wants it smaller. Camera save was fixed in v1.6.1 but might still have the race condition issue.

**Fix**: Reduce height to `h-[200px]`. Verify camera save path uses the preview camera ref correctly.

### 7. HA integration check
The HA WebSocket integration looks comprehensive. Verify entity mapping, state sync, and service calls are properly wired through the persistent scene architecture.

**Fix**: Audit the HA bridge for any broken connections after the scene consolidation. Ensure `haServiceCaller` is properly initialized and `useHABridge` toggle functions work through the persistent scene.

## Files to Change

| File | Change |
|------|--------|
| `src/lib/wallGeometry.tsx` | Fix corner block geometry — add polygon offset, padding, better hull validation |
| `src/components/PersistentScene3D.tsx` | Add Canvas key based on quality/shadows/AA for remounting; move sun closer (dist 20→12) |
| `src/components/home/DashboardGrid.tsx` | Reduce 3D preview height 280→200px |
| `src/components/home/DashboardPreview3D.tsx` | Minor cleanup |
| `src/components/devices/DeviceMarkers3D.tsx` | Ensure media_screen renders correctly in all contexts |
| `src/components/build/BuildModeV2.tsx` | Verify/fix Bibliotek import button accessibility |
| `src/components/home/cards/SunWeatherPanel.tsx` | Add clearer descriptions for calibration controls |
| `src/components/home/cards/GraphicsSettings.tsx` | Minor — ensure canvas remount notification |
| `package.json` | Bump to 1.6.2 |
| `CHANGELOG.md` | Add 1.6.2 entry |
| `docs/patchnotes-v1.6.0.md` | Update with v1.6.2 fixes |

