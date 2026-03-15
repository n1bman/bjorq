

# Verification & Cleanup Report — Phase 1–3

## Findings

### 1. `BuildScene3D.tsx` — Dead Code
Not imported anywhere. Pure dead code after the persistent scene migration. Safe to remove.

### 2. `Scene3D.tsx` — Still Actively Used
Imported by two dashboard components:
- **`DashboardView.tsx`** (line 1, 17): Renders a full `<Scene3D />` as background when `dashboardBg === 'scene3d'` — creates a **second WebGL context** alongside the persistent canvas
- **`DashboardGrid.tsx`** (line 2, 244): Renders a mini `<Scene3D />` preview widget inside a settings card — creates a **third WebGL context**

This defeats the purpose of the persistent canvas. These should be removed or replaced with a view into the persistent scene.

### 3. Design/Build Camera Regression — ROOT CAUSE FOUND

**The BuildModeV2 overlay blocks all pointer events to the persistent Canvas.**

```text
Index.tsx layout:
  ┌─ PersistentScene3D (z-0) ──────────────┐
  │  <Canvas> with OrbitControls            │  ← receives NO events
  └────────────────────────────────────────-─┘
  ┌─ BuildModeV2 (z-auto, full-size div) ──┐
  │  captures all pointer events            │  ← blocks canvas
  │  toolbars, panels, inspector            │
  └─────────────────────────────────────────┘
```

In the old architecture, `BuildScene3D` was rendered INSIDE `BuildModeV2`, so events flowed naturally. Now the canvas is behind the overlay, and the overlay's root `<div className="w-full h-full relative flex flex-col">` intercepts everything.

**Fix:** Make BuildModeV2's root container `pointer-events-none`, then re-enable `pointer-events-auto` on its interactive children (toolbars, panels, inspector, tab bars).

### 4. BuildCameraController — Missing `pendingFlyTo`

The `BuildCameraController` (line 178-204) does NOT handle `pendingFlyTo`. Room navigation fly-to requests from the room list will silently fail in build mode. The old `BuildScene3D` had this handled via `controlsRef` inside `SceneContent`. Need to add flyTo lerp logic matching `InteractiveCameraController`.

### 5. `HomeView.tsx` — Clean (no Scene3D import)

Already converted to overlay-only. No regression.

### 6. `StandbyMode.tsx` — Clean (no Scene3D import)

Already converted. No regression.

### 7. HA State Propagation

The persistent `UnifiedSceneContent` reads from `useAppStore` reactively — environment, devices, rooms, weather all use store subscriptions. HA updates flow through the same store path. No regression expected here since nothing about the store subscription model changed.

---

## Plan — Cleanup & Camera Fix

### A. Fix Build Camera (Critical)

**`BuildModeV2.tsx`** — Make root container pass-through:
- Root div: add `pointer-events-none`
- `BuildTopToolbar` wrapper: add `pointer-events-auto`
- Left panels (device, surface, import, catalog): already have `absolute` + `z-20`, add `pointer-events-auto`
- `BuildInspector`: add `pointer-events-auto`
- `BuildCatalogRow` + `DesignTabBar`: add `pointer-events-auto`
- `BuildCanvas2D` area: add `pointer-events-auto` (2D mode needs its own events)

**`PersistentScene3D.tsx`** — Fix `BuildCameraController`:
- Add `pendingFlyTo` handling (lerp logic) matching the pattern in `InteractiveCameraController`
- Add `lerpingTo` ref for smooth camera transitions

### B. Remove Dashboard Double-Canvas

**`DashboardView.tsx`**:
- Remove `import Scene3D` and the inline `<Scene3D />` render
- The persistent canvas is already visible behind the dashboard overlay — just make the dashboard background transparent where `dashboardBg === 'scene3d'`

**`DashboardGrid.tsx`**:
- Remove `import Scene3D` and the mini `<Scene3D />` preview widget
- Replace with a static placeholder or a `useCameraSnapshot` hook that captures a still from the persistent canvas

### C. Remove Dead Code

- **`BuildScene3D.tsx`**: Delete entirely (701 lines). Not imported anywhere.
- **`Scene3D.tsx`**: After removing DashboardView/DashboardGrid references, verify no other imports remain. If clean, delete entirely.

### D. Same-mode `HomeView` pointer-events check

HomeView is also a full-screen overlay — verify it already uses `pointer-events-none` on non-interactive areas so the persistent canvas receives orbit/pan/zoom events correctly in home mode.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/build/BuildModeV2.tsx` | `pointer-events-none` on root, `pointer-events-auto` on interactive children |
| `src/components/PersistentScene3D.tsx` | Add flyTo handling to `BuildCameraController` |
| `src/components/home/DashboardView.tsx` | Remove Scene3D import/usage, transparent bg for persistent canvas |
| `src/components/home/DashboardGrid.tsx` | Remove Scene3D mini-preview, replace with snapshot or placeholder |
| `src/components/home/HomeView.tsx` | Verify pointer-events pass-through |
| `src/components/build/BuildScene3D.tsx` | Delete (dead code) |
| `src/components/Scene3D.tsx` | Delete after all references removed |

## What Comes Next

After this cleanup:
1. Phase 3.5 (warm/idle rendering) — throttle render loop when standby/dashboard is active
2. Phase 4 (loading screen) — first-load UX
3. Phase 5 (cache HUD) — expose model cache stats in PerformanceHUD

