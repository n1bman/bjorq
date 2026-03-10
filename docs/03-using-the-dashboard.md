# Using the Dashboard

BJORQ Dashboard has two main areas: the **Home View** (daily use) and **Build Mode** (setup and configuration). You switch between them using the bottom navigation bar.

---

## Home View

The Home View is the main screen you see on your tablet or kiosk. It shows a 3D view of your home with overlaid widgets and a category-based control grid.

### Widgets

Floating widgets on the home screen provide at-a-glance information:

| Widget | Description |
|--------|-------------|
| **Klocka** | Digital clock with date |
| **Väder** | Current weather, synced with Home Assistant or manual location |
| **Temperatur** | Indoor/outdoor temperature from HA sensors |
| **Energi** | Power consumption overview |
| **Kalender** | Upcoming events |

Widgets can be toggled on/off in **Inställningar → Widgetar**.

### Dashboard Categories

Tap the category bar or swipe to browse:

- **Hem** — Quick access to favorite devices, device cards, and room overview
- **Väder** — Detailed weather with forecast
- **Kalender** — Calendar events view
- **Enheter** — All devices, filterable by kind (lights, sensors, climate, etc.)
- **Energi** — Power consumption per device. Supports both manual watt estimates and live HA energy data
- **Automatiseringar** — Home Assistant automations, toggle on/off
- **Scener** — Trigger HA scenes directly
- **Övervakning** — Live camera snapshots with 5-second polling, expandable full-screen view, motion sensor status, and activity log
- **Robot** — Vacuum robot control (Roborock, etc.) with room-specific cleaning and debug overlay
- **Klimat** — Climate rules and comfort engine with automatic device control based on sensor thresholds
- **Aktivitet** — Recent events and state changes
- **Inställningar** — All settings (see below)

### Settings

Access via **Inställningar** in the category grid:

| Setting | What It Controls |
|---------|-----------------|
| **Profil** | Name, theme (dark/light), accent color, dashboard background |
| **Grafik & Miljö** | Rendering quality, shadows, sun & weather calibration, terrain, sky style — 3 collapsible sections |
| **Standby** | Idle timeout, standby clock screen, camera view |
| **Skärm** | App mode commands, fullscreen toggle, OS kiosk instructions |
| **Home Assistant** | HA URL, access token, connection status |
| **Wizard** | Asset Wizard URL, connection test, catalog sync |
| **Plats** | Latitude/longitude for sun position and weather |
| **WiFi** | Network info display |
| **Widgetar** | Toggle which widgets appear on the home screen |
| **Data & Backup** | Save, restore, clear data, load demo project |

---

## Build Mode

Build Mode is where you create and configure your 3D home model. It has four tabs:

### Structure (Struktur)

Build your home layout from scratch:

- **Väggar** — Draw walls by clicking points. Walls snap to grid.
- **Rum** — Define rooms by selecting their bounding walls. Rooms get automatic floor rendering.
- **Dörrar & Fönster** — Add openings to walls with configurable width, height, and sill height.
- **Trappor** — Place stairs connecting floors.
- **Måla** — Apply materials (paint, wood, tile, concrete, metal) to walls and floors.
- **Mallar** — Quick-start room templates (e.g., bathroom, kitchen, bedroom) with preset dimensions and materials.
- **Våningar** — Add/remove floors, set elevation and ceiling height.

### Import (Importera)

Import a 3D model of your home:

- Upload a **GLB/GLTF** file of your home
- Adjust **position, rotation, and scale** to align with the grid
- Set **ground level** and **north angle** for accurate sun simulation
- Define **floor bands** to split the model into floors
- Adjust **opacity** to make the model transparent (useful for seeing device markers inside)
- View **model statistics** (triangle count, materials, textures) with a performance rating

### Furnish (Möblera)

Add furniture and props to your rooms:

- Browse the **prop catalog** with built-in and user-uploaded models
- Place props with drag-and-drop positioning
- Adjust position, rotation, and scale per prop
- Each prop shows its triangle count and performance impact

### Devices (Enheter)

Place smart home device markers in 3D:

- **Device types:** Light, switch, sensor, climate, vacuum, camera, media screen, fan, cover, alarm, speaker, and many more
- **Light types:** Choose between different light fixture styles (ceiling, wall, strip, pendant, etc.)
- **Placement surfaces:** Floor, wall, ceiling, or free-floating
- **HA Entity binding:** Link each marker to a Home Assistant entity for live state updates and control
- **Energy tracking:** Set estimated wattage per device for energy monitoring
- **Vacuum zones:** Map rooms to vacuum segments for room-specific cleaning

---

## 3D Scene

The 3D scene is the centerpiece of BJORQ. It renders:

- Your imported home model (or procedural walls/rooms)
- Device markers with interactive state (lights glow, sensors pulse, etc.)
- Dynamic sun position based on your location and time
- Weather effects (rain, snow, clouds)
- Furniture and props

### Camera Controls

- **Orbit** — Click and drag to rotate
- **Pan** — Right-click and drag (or two-finger drag on touch)
- **Zoom** — Scroll wheel (or pinch on touch)
- **Camera presets** — Quick views from the camera FAB button

### Room Navigation

The **Room Navigator** (door icon FAB) lists all detected rooms with device and light counts. Clicking a room:

1. Flies the camera to the room's saved camera preset (or auto-calculated top-down view)
2. Opens a **Room Detail Panel** showing:
   - Devices in the room with on/off toggle
   - Scenes linked to the room with activate button
   - Automations linked to the room with status

### Device ↔ Room Assignment

Devices placed in Build Mode are **automatically assigned to rooms** based on their 3D position. The assignment uses a point-in-polygon algorithm against detected room polygons. You can manually override the room in the Device Inspector ("Rum" dropdown).

When rooms are re-detected (e.g., after editing walls), device assignments are automatically re-evaluated.

### Scene & Automation Room Linking

Scenes and automations can optionally be **linked to rooms**. When creating or editing a scene/automation, select which rooms it applies to. Linked scenes can also trigger a **camera fly-to** when activated (`cameraMode: 'first-linked-room'` or `'custom'`).

---

## Tips

- Start with **Build Mode → Import** if you have a 3D model of your home
- Use **Build Mode → Structure** if you want to draw your layout from scratch
- Place devices in **Build Mode → Devices**, then switch to **Home View** to control them
- Use **Surfplatteläge** (tablet mode) in Performance settings for slower devices
- The **demo project** (under Data & Backup) gives you a quick starting point
