

# HA-Style Widget Dashboard -- Hem View

## Inspiration
The reference images show a Home Assistant "Lovelace" style dashboard: a dark full-screen grid of room cards, each showing device icons and status, plus weather/clock/power widgets. No traditional bars -- everything is floating cards on a dark background.

## Design

The Home view becomes a full-screen space with two layers:
1. **3D scene** as background (the built home, same as now)
2. **A semi-transparent card grid overlay** on top, HA-style

The user can toggle between "3D view" (full 3D, minimal widgets) and "Dashboard view" (the HA-style card grid over the dimmed 3D background).

### Dashboard Card Grid
A CSS grid of glassmorphic room/widget cards overlaid on the 3D scene:

```text
+--------------------------------------------------+
| 12:45                    11.4C  Klart     1541 W  |
| Torsdag                  33 km/h SSW      1.5 kr  |
+----------+----------+----------+---------+--------+
| Vardags- | Kok      | Sovrum   | Badrum  |        |
| rum      |          |          |         |        |
| [icons]  | [icons]  | [icons]  | [icons] |        |
| 21.2C    | 22.1C    | 19.8C    |         |        |
+----------+----------+----------+---------+--------+
| Garage   | Hall     | Kontor   |  ...    |        |
| [icons]  | [icons]  | [icons]  |         |        |
+----------+----------+----------+---------+--------+
|                                                   |
|         [3D vy]  [Hem]  [Bygge]                   |
+---------------------------------------------------+
```

### Key Elements

**Top bar (floating, no background):**
- Clock + date (left)
- Weather info (center-left): temperature, wind, condition icon
- Power/energy stats placeholder (right)

**Room cards (grid):**
- One card per room from the layout store
- Each card shows: room name, device icons for devices in that room, temperature (placeholder)
- Cards are dark glassmorphic with subtle borders
- Device icons are color-coded: yellow = active, blue = sensor, gray = off
- Tapping a card could later expand to show device controls

**Quick-access device icons on cards:**
- Each room card shows small icons for the devices placed in that room
- Icons match device kinds: lightbulb, thermometer, switch, etc.

**Bottom nav:**
- Minimal floating pill: "3D vy" (toggle to full 3D), "Hem" (current), "Bygge"

## Technical Changes

### 1. Update `src/store/types.ts`
- Change `AppMode` to `'home' | 'build'`
- Add `homeView` state:
  ```
  homeView: {
    viewMode: 'dashboard' | '3d'  // toggle between card grid and full 3D
    cameraPreset: 'free' | 'topdown' | 'angle' | 'front'
  }
  ```
- Add actions: `setHomeViewMode`, `setCameraPreset`

### 2. Update `src/store/useAppStore.ts`
- Default `appMode` to `'home'`
- Add `homeView` state and actions
- Bump store version to force fresh state

### 3. New: `src/components/home/HomeView.tsx`
- Full-screen wrapper component
- When `viewMode === 'dashboard'`: renders Scene3D dimmed in background + card grid overlay
- When `viewMode === '3d'`: renders Scene3D full-screen with minimal floating controls
- Renders the floating bottom pill nav

### 4. New: `src/components/home/DashboardGrid.tsx`
- The main HA-style card grid overlay
- Renders a responsive CSS grid of room cards + widget cards
- Top section: ClockWidget, WeatherWidget, EnergyWidget
- Main section: one RoomCard per room from store
- Each RoomCard shows:
  - Room name (from layout)
  - Floor label
  - Device icons (filtered by roomId from devices.markers)
  - Placeholder temperature

### 5. New: `src/components/home/cards/RoomCard.tsx`
- Glassmorphic dark card
- Shows room name, device kind icons with color states
- Compact layout matching the HA reference style
- Click handler (future: expand to control devices)

### 6. New: `src/components/home/cards/ClockWidget.tsx`
- Shows current time (large), date below
- Live-updating with `useState` + `setInterval`
- Swedish locale date formatting

### 7. New: `src/components/home/cards/WeatherWidget.tsx`
- Shows temperature, wind (placeholder), weather condition icon
- Reads from `environment.weather` in store

### 8. New: `src/components/home/cards/EnergyWidget.tsx`
- Placeholder card showing power consumption stats
- Static placeholder data for now (e.g., "1541 W", "1.5 kr/kWh")

### 9. Update `src/components/BottomNav.tsx`
- Change to 2 main tabs: "Hem" and "Bygge"
- Add a "3D vy" toggle button that switches `homeView.viewMode`
- Make it a floating semi-transparent pill
- Only visible in home mode

### 10. Update `src/components/ModeHeader.tsx`
- Hide completely in home mode (dashboard has its own top section)
- Only show in build mode

### 11. Update `src/pages/Index.tsx`
- Home mode: render `HomeView` (no ModeHeader, no BottomNav padding)
- Build mode: render `BuildModeV2` with ModeHeader and BottomNav as before

### 12. Update `src/components/Scene3D.tsx`
- Accept an optional `dimmed` prop to apply a dark overlay when dashboard grid is shown
- Add camera preset logic (animate to preset positions)

### 13. Cleanup
- Delete `src/components/dashboard/DashboardOverlay.tsx` (replaced by DashboardGrid)
- Delete `src/components/devices/DevicesOverlay.tsx` (devices integrated into room cards)

## Styling
- All cards use the existing `glass-panel` class with the dark theme
- Device icons use lucide-react icons, colored with amber (active), blue (sensor), gray (off)
- Room cards have subtle `glass-border` borders
- Responsive grid: 3-4 columns on desktop, 2 on tablet, 1 on mobile
- Clock uses the `Space Grotesk` display font already imported

## Implementation Order
1. Update types and store (AppMode, homeView state)
2. Create card components (RoomCard, ClockWidget, WeatherWidget, EnergyWidget)
3. Create DashboardGrid
4. Create HomeView wrapper
5. Update BottomNav to floating pill with 3D toggle
6. Update ModeHeader to hide in home mode
7. Update Scene3D with dimming and camera presets
8. Update Index.tsx
9. Delete old overlay files

