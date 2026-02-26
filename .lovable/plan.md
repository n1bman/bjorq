

# Hybrid 2D/3D Import Tracing View

## Approach
When the import tab is active and the view is in "Plan" (topdown) mode, layer a 3D canvas with an orthographic top-down camera **behind** the 2D canvas. The 2D canvas gets a transparent background so the imported 3D model is visible underneath. Users can then use the existing wall/room tools to trace over the model.

This avoids creating a separate tracing system — the walls drawn are real walls that define rooms, but the user can see the imported model as a guide.

## File Changes

### 1. `src/components/build/BuildModeV2.tsx`
- When `cameraMode === 'topdown'` AND `homeGeometry.source === 'imported'`, render **both** canvases stacked: 3D canvas (orthographic top-down, showing only the imported model) at the back, 2D canvas on top with transparent background.
- The 3D sub-canvas uses a fixed orthographic camera synced to the 2D canvas zoom/pan.

### 2. New: `src/components/build/ImportPreview3D.tsx`
- Minimal R3F Canvas with orthographic camera looking straight down.
- Renders only `ImportedHome3D` + ambient light + grid.
- Accepts `zoom` and `offset` props from the 2D canvas to keep cameras synced.
- No orbit controls — camera is locked top-down.

### 3. `src/components/build/BuildCanvas2D.tsx`
- Accept an `overlayMode` prop. When true:
  - Skip the opaque background fill (`ctx.fillRect`) — leave canvas transparent.
  - Optionally dim the grid slightly so the 3D model is more visible.
- Expose `zoom` and `offset` state via a shared ref or store so the 3D preview can sync.

### 4. `src/components/build/import/ImportTools.tsx`
- Remove the "Plats (koordinater)" section (lines 148-176) — already available under weather settings.
- Improve scale slider: change range from `0.01-10` to `0.1-5` with step `0.05` for less sensitivity. Add a numeric input next to the slider for precise values.
- Add scale reference text showing approximate grid squares (e.g., "1 ruta = 0.5m vid nuvarande skala").

### 5. `src/store/useAppStore.ts`
- Add `importOverlaySync: { zoom: number; offsetX: number; offsetY: number }` to build state, updated by BuildCanvas2D, read by ImportPreview3D.

```text
┌─────────────────────────┐
│  BuildModeV2            │
│  ┌───────────────────┐  │
│  │ ImportPreview3D    │  │  ← z-index: 0, orthographic top-down 3D
│  │ (only imported     │  │
│  │  model visible)    │  │
│  ├───────────────────┤  │
│  │ BuildCanvas2D      │  │  ← z-index: 1, transparent background
│  │ (walls, rooms,     │  │     user draws here
│  │  grid overlay)     │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

The 2D canvas zoom/pan is synced to the orthographic camera: `camera.zoom = canvasZoom / baseFactor`, `camera.position.x = -offsetX / canvasZoom`.

