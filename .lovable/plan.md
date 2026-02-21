

# HomeTwin Pro – Digital Twin Smart Home Platform

## Overview
A premium 3D digital twin smart home platform with Swedish UI, dark Scandinavian aesthetic, and three distinct modes: Dashboard (view/control), Devices (placement/binding), and Build (floorplan/structure). Built with React Three Fiber for 3D rendering and Zustand for state management.

---

## Phase 1 – Foundation & Design System

### 1.1 Design System & Layout Shell
- Dark charcoal theme with warm amber accents and cool blue info tones
- Glass-morphism panel components
- Swedish typography and UI labels throughout
- Bottom navigation bar with mode switcher: **Kontrollpanel** (Dashboard), **Enheter** (Devices), **Bygge** (Build)
- Responsive, mobile-first layout with bottom sheets for panels

### 1.2 Zustand Store Architecture
- Strict layered state: `layout`, `devices`, `props`, `environment`, `homeAssistant`
- Each layer fully independent
- localStorage persistence for all layers
- Undo/redo history for Build mode operations

### 1.3 Basic 3D Scene
- React Three Fiber canvas with drei helpers
- Orbit/zoom/pan camera controls (touch-friendly: 1-finger drag, 2-finger pinch/pan)
- Dollhouse camera preset
- Ground plane and ambient lighting
- Soft shadows setup

---

## Phase 2 – Build Mode (Floorplan & Structure)

### 2.1 Floor Management
- Add/remove/rename floors (Våning 1, Våning 2…)
- Floor picker UI
- Elevation setting per floor
- Grid system with configurable size

### 2.2 Floorplan Import & Scale Calibration ⭐
- Upload floorplan image (PNG/JPG)
- Display as 2D background layer
- **Scene Scale Calibration**: Draw a reference line over a known wall → enter real-world meters → system calculates pixel-to-meter scale
- All subsequent layout data uses real-world meter units

### 2.3 Wall System (2D Editor with 3D Preview)
- 2D-first wall drawing: click to place wall nodes, segments snap to grid
- Move wall nodes, split walls, delete walls
- Undo/redo support
- Walls render as extruded 3D meshes in preview
- Wall openings (doors/windows): placed by offset on wall segment, width/height params, visual mesh splitting (no boolean cutting)

### 2.4 Room Detection & Materials
- Auto-detect closed wall loops as rooms
- Assign room name and materials
- Materials panel: preset materials (paint, concrete, wood), color picker, roughness presets
- Materials applied to walls, floors, doors, window frames
- Materials stored by `materialId` and referenced by rooms/walls/openings

### 2.5 Props System
- Import GLB/GLTF files as visual props
- Place via raycast onto floor
- Drag to move, slider to rotate, optional scale slider
- Purely visual — no smart logic
- Persisted in Zustand + localStorage

---

## Phase 3 – Devices Mode (Placement & HA Binding)

### 3.1 Device Placement
- Device types: Light, Switch/Button, Sensor, Climate, Vacuum Dock
- Raycast placement onto floor/wall/ceiling surfaces
- Optional grid snap
- TransformControls for positioning (translate only in MVP)
- OrbitControls disabled while dragging
- Devices rendered as abstract billboard markers (not heavy 3D models)
- Persisted per floor with position/rotation

### 3.2 Home Assistant Integration
- WebSocket connection UI: URL + long-lived access token input
- Fetch HA entities list
- Bind device marker to `entity_id`
- Subscribe to live state updates via WebSocket
- Connection status indicator

---

## Phase 4 – Dashboard Mode (View & Control)

### 4.1 3D Digital Twin View
- Multi-floor dollhouse rendering with all layers combined
- Floor selector: Alla, Våning 1, Våning 2…
- Room filter
- No editing allowed — view and control only

### 4.2 Overlay Markers & Smart Controls
- Billboarded device icons with large invisible touch hit areas (min 44px)
- Tap → quick control popup (toggle light, start vacuum, etc.)
- Long press → detail drawer/bottom sheet
- Control types:
  - **Light**: toggle + brightness slider
  - **Switch**: toggle
  - **Sensor**: read-only value display
  - **Climate**: temperature set point
  - **Vacuum**: start / return to base

### 4.3 Environment Layer
- Sun position from HA `sun` entity (fallback: manual location input)
- Dynamic directional light matching sun azimuth/elevation
- Daylight intensity & color temperature shifts
- Indoor light warmth adjusts with time of day

### 4.4 Weather Particles
- Subtle rain/snow particles rendered outside the building only
- Driven by HA weather entity or manual setting

### 4.5 Preview Time Scrubber ⭐
- Toggle between **Live** (real-time from HA/system) and **Förhandsvisning** (Preview)
- 24-hour time scrubber slider
- Optional date selector
- Sun position, lighting, and ambience update smoothly as scrubber moves
- Simulate morning light, golden hour, night mode, winter darkness
- Premium smooth animation feel

---

## Technical Notes
- **3D Engine**: React Three Fiber + drei (orbit controls, billboard, transform controls, environment)
- **State**: Zustand with localStorage persistence, strict layer separation
- **No backend needed for MVP** — all data local
- **HA Integration**: Direct WebSocket from browser to Home Assistant instance
- **Touch UX**: Mobile-first gestures, large handles, bottom sheet panels
- **Texture/GLB caching** for performance

