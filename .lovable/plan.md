

# Complete Build Mode and Sync with Dashboard/Devices

## Overview
The build mode has good editing tools, but the rest of the app is empty. When a user finishes building, nothing appears in the Dashboard ("Kontrollpanel") or Devices ("Enheter") views. The main 3D scene (`Scene3D`) is a static empty canvas that doesn't render any of the layout data. There's also no explicit "save" action or feedback -- though data does persist automatically via localStorage.

## What's Missing

### 1. Dashboard and Devices show nothing
The `Scene3D` component used by both Dashboard and Devices modes renders only a ground plane and grid -- no walls, rooms, floors, imported models, props, or weather effects. All the 3D components (InteractiveWalls3D, Floors3D, Ceilings3D, Stairs3D, ImportedHome3D, Props3D, WeatherEffects3D) are only used inside `BuildScene3D`.

### 2. No explicit save/done action
The store auto-persists to localStorage, so data IS saved. But there's no user-facing "Spara" (Save) button or visual confirmation. Users don't know their work is saved.

### 3. Devices mode has no functionality
The Devices tab exists in the bottom nav but shows the same empty scene as Dashboard. There's no UI for placing device markers, binding to Home Assistant entities, or viewing device states.

### 4. Dashboard has no controls
The Dashboard should show the finished home with environment controls (time of day, weather) and device states, but currently it's just an empty 3D scene.

---

## Plan

### A. Make Scene3D render the built home
Refactor `Scene3D` to render all layout geometry (walls, floors, ceilings, stairs, imported model, props, weather) just like `BuildScene3D` does, but in a read-only/view mode (no editing tools, no selection highlights). This is the core fix -- once the home renders in Scene3D, both Dashboard and Devices modes will show the built home.

**Changes to `src/components/Scene3D.tsx`:**
- Import and render: InteractiveWalls3D (or a view-only variant), Floors3D, Ceilings3D, Stairs3D, ImportedHome3D, Props3D, WeatherEffects3D
- Read sun position and weather from store for lighting
- Keep OrbitControls for viewing

### B. Add a "Spara & Visa" (Save & View) button in Build mode
Add a button in `BuildTopToolbar` or `BuildTabBar` that switches from build mode to dashboard mode. Since data auto-persists, this is just a mode switch with a toast confirmation ("Sparad!").

**Changes to `src/components/build/BuildTopToolbar.tsx`:**
- Add a "Klar" (Done) button that calls `setAppMode('dashboard')` and shows a toast

### C. Add basic Dashboard overlay
Create a `DashboardOverlay` component that shows on top of Scene3D in dashboard mode with:
- Environment controls (sun direction, weather, time) -- reuse the same controls from BuildTopToolbar
- Room list with temperatures (placeholder data for now)
- A "Redigera" (Edit) button to go back to build mode

**New file: `src/components/dashboard/DashboardOverlay.tsx`**

### D. Add basic Devices mode UI
Create a `DevicesPanel` component for devices mode showing:
- List of placed device markers
- "Lagg till enhet" (Add device) button with device type picker
- Device placement on the 3D scene (click to place)
- Device inspector when selected (position, type, HA entity binding)

**New files:**
- `src/components/devices/DevicesOverlay.tsx` -- panel with device list and controls
- `src/components/devices/DeviceMarkers3D.tsx` -- renders device markers in 3D scene

### E. Update Index.tsx layout
Update the page layout so Dashboard and Devices modes show Scene3D with their respective overlays.

**Changes to `src/pages/Index.tsx`:**
- Import DashboardOverlay and DevicesOverlay
- Render them conditionally based on appMode

---

## Technical Details

### Scene3D changes
```text
Current: Empty scene (ground + grid + lights)
After:   Full home render (walls + floors + ceilings + stairs + 
         imported model + props + weather + sun position)
```

The key difference from BuildScene3D: no editing interactions (no wall drawing, no tool handling, no selection). Just pure rendering with orbit camera controls.

### Store -- no changes needed
The store already has all the data structures and actions needed. Layout data, environment state, and device markers are all persisted.

### Device markers in 3D
Each `DeviceMarker` from the store will render as a small icon/sphere in the 3D scene at its position. Clicking a marker in devices mode selects it and shows its inspector.

### Dashboard environment controls
Reuse the same sun/weather slider logic from BuildTopToolbar but in a floating panel on the dashboard view.

---

## Implementation Order
1. Refactor Scene3D to render layout geometry (walls, floors, etc.)
2. Add "Klar" button in build mode toolbar
3. Create DashboardOverlay with environment controls
4. Create DevicesOverlay with device list and placement
5. Create DeviceMarkers3D for 3D rendering
6. Update Index.tsx to wire everything together

