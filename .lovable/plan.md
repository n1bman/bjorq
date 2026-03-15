

# Fix: Restore Live 3D View in Dashboard Cards

## Problem
The previous migration removed `Scene3D` from dashboard cards and replaced them with placeholder text "3D-vy (bakgrund)". The persistent canvas is behind the opaque `DashboardShell`, making it invisible. A scrollable dashboard cannot use "transparent windows" to show a fixed-position canvas behind it.

## Solution
Create a lightweight `DashboardPreview3D` component — a small `<Canvas>` that renders the home model (walls, floors, props, devices) inside dashboard cards. It reuses the same scene sub-components and shared model cache, so no duplicate asset loading occurs. This is exactly how it worked before (Scene3D inside the card), but stripped down to only rendering — no build tools, no wall drawing, no interactive placement.

## Architecture

```text
PersistentScene3D (z-0, behind shell)
  └── Full scene + camera controllers + build tools

DashboardShell (z-auto, opaque overlay)
  └── HomeCategory card
       └── DashboardPreview3D ← NEW lightweight Canvas
            └── Walls3D, Floors3D, Props3D, DeviceMarkers3D, lighting
            └── OrbitControls (interactive)
  └── GraphicsCategory preview
       └── DashboardPreview3D (same component, reused)
  └── CameraStartSettings preview
       └── DashboardPreview3D (same component, reused)
```

## Files

| File | Change |
|------|--------|
| `src/components/home/DashboardPreview3D.tsx` | **NEW** — Lightweight Canvas with model rendering + OrbitControls |
| `src/components/home/DashboardGrid.tsx` | Replace 3 placeholder divs with `<DashboardPreview3D />` |

## DashboardPreview3D Details
- Renders: `Walls3D`, `Floors3D`, `Props3D`, `ImportedHome3D`, `DeviceMarkers3D`, `GroundPlane`, lighting
- Interactive: `OrbitControls` with damping, pan, rotate, zoom
- Lightweight: No build tools, no wall drawing, no weather effects, no ceilings
- Shares model cache with persistent scene (no duplicate loading)
- ~80 lines of code

