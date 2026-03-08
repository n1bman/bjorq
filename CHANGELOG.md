# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-03-08

### Added
- **Room Context System** — devices automatically assigned to rooms based on 3D position
- **Room Detail Panel** — view and control devices, scenes, and automations per room from Home view
- **Room Navigator FAB** — floating button in Home view listing all rooms with device counts and camera fly-to
- **Room Camera Presets** — save and restore camera positions per room in Build Mode
- **Scene ↔ Room linking** — scenes can target specific rooms with optional camera fly-to on activation
- **Automation ↔ Room linking** — automations can be associated with rooms
- **Scene camera integration** — activating a scene can fly the camera to the linked room or a custom position
- `findRoomForPoint()` utility for point-in-polygon room lookup
- `cameraForPolygon()` auto-generates a top-down camera view from room polygon centroid
- Manual room override dropdown in Device Inspector

### Fixed
- `require()` calls in RoomInspector replaced with proper dynamic imports
- Device room assignments automatically re-evaluated when rooms change

### Changed
- RoomNavigator now opens a detail panel on room selection (not just camera fly-to)
- Room detection preserves camera presets during re-detection via overlap analysis

## [0.4.0] - 2026-03-07

### Added
- Wall node-snapping — new walls snap to existing endpoints (0.25m threshold)
- Mid-wall snapping — snap to any point along an existing wall segment (T-junction support)
- Visual snap indicators: green ring (endpoint), yellow ring with cross (mid-wall)
- Node connection status: green rings for connected nodes (2+ walls), orange for open ends
- T-junction auto-splitting in room detection — inner walls connecting mid-segment now form rooms
- Wall healing system — automatically merges endpoints within 20cm to fix old imprecise walls
- "Heal walls" toolbar button (wrench icon) for manual wall repair with toast feedback

### Fixed
- Room detection failing when walls had microscopic gaps (EPSILON increased from 5cm to 15cm)
- Room detection wall ID lookup searching wrong array after T-junction split
- Duplicated utility functions across multiple files consolidated to single sources

### Changed
- Node connectivity tolerance aligned with EPSILON (0.15m) for accurate visual feedback

## [0.3.0] - 2026-03-02

### Added
- **Climate tab** with dedicated comfort engine — create rules that automatically control devices based on sensor thresholds (temperature, humidity, CO₂)
- **Comfort Engine** (`useComfortEngine`) — client-side rule evaluator with hysteresis, time-of-day schedules, and 30-minute override
- **Performance HUD** — floating overlay showing real-time FPS, quality level, and CPU core count
- **Hardware auto-detection** — automatically enables tablet mode and low quality on devices with ≤4 cores or ≤4 GB RAM
- **Max lights limiter** — cap the number of active pointLights in the 3D scene (0–16) for low-end GPUs
- **Vacuum debug overlay** — real-time telemetry panel showing 3D position, target waypoint, active zone, and animation FPS for lawnmower/vacuum robots
- **Vacuum debug telemetry** in `useFrame` loop — writes live position data to store at 2 Hz

### Changed
- DPR floor lowered to 0.75 in tablet mode (from 1.0) for better RPi performance
- Antialiasing auto-disabled on weak hardware (≤4 cores)
- Performance settings panel expanded with max lights slider and HUD toggle

## [0.2.8] - 2026-03-02

### Fixed
- HA Add-on install returning 404 "manifest unknown" — Docker image tags now read from `config.yaml` version instead of git ref (which included a `v` prefix)
- Switched Dockerfile.runtime base from `node:20-alpine` to `node:20-bookworm-slim` to fix QEMU illegal instruction crashes on arm64/armv7

## [0.2.5] - 2026-03-02

### Fixed
- HA Add-on Docker build failing due to `npm ci` requiring exact lockfile sync — switched to `npm install`
- Made `package-lock.json` optional in Dockerfile COPY step

## [0.2.4] - 2026-03-02

### Fixed
- Props/furniture no longer selectable or draggable outside Build mode (prevented accidental interaction in Home/Dashboard)

## [0.2.3] - 2026-03-02

### Added
- Home Assistant Add-on support (`bjorq_dashboard/` with config.yaml, Dockerfile, run.sh)
- `repository.yaml` for HA Add-on Store repository discovery
- GHCR multi-arch image build workflow (amd64, aarch64, armv7)
- Configurable data directory via `BJORQ_DATA_DIR` environment variable
- HA Add-on installation instructions in README

### Changed
- `server/storage/paths.js` — `dataDir()` now respects `BJORQ_DATA_DIR` env var (fallback unchanged)

## [0.2.2] - 2026-03-02

### Added
- "Sparad vy" option in Camera FAB to snap back to saved start position
- Widgets tab in Dashboard (moved from Settings)
- Enhanced Profile panel with connected accounts section (HA, Spotify, E-post placeholders)
- ThemeCard, DataBackupCard, SystemStatusCard as separate focused components
- PowerShell scripts (`start.ps1`, `install.ps1`) for Windows compatibility
- `QUICK-START.txt` with step-by-step install instructions for all platforms

### Fixed
- Camera start view not applying when navigating between modes (remount bug)
- Camera now applies saved position immediately on Scene3D mount

### Changed
- Settings reorganized: Profil, Utseende, Skärm (with Standby + Startvy), System (with SystemStatus), Anslutning, Data
- ProfilePanel split into ProfilePanel + ThemeCard + DataBackupCard + SystemStatusCard
- Release artifacts now include PS1 scripts and QUICK-START.txt

## [0.2.1] - 2026-03-02

### Fixed
- Camera start view now applies correctly when navigating to Home or Dashboard
- Camera also re-applies immediately when saving a new start view
- Removed duplicate `set_percentage` call for fan devices in HA bridge
- Speaker/soundbar default state now correctly initializes as media type (from v0.2.0)

### Changed
- Moved device visibility picker from bottom-left to top-right corner on Home screen
- Shrunk Camera Start Settings panel to compact single-row layout
- Version is now auto-injected from package.json via Vite `define` (from v0.2.0)

## [0.2.0] - 2026-03-02

### Added
- Numeric input fields alongside sliders in Build Inspector for precise value entry
- Automated version injection via Vite `define` (`__APP_VERSION__`)
- Fallback rendering for MediaScreenMarker in production builds
- Speaker and soundbar default state support in device store

### Fixed
- Speaker devices not syncing with Home Assistant
- Media player commands dropped during idle/off/standby states (volume now allowed)
- Version always showing v0.0.0 in release builds

### Changed
- HA polling interval reduced from 5000ms to 2000ms for better responsiveness
- Slider steps adjusted: 0.5 for position, 5 for rotation

## [0.1.0] - 2025-12-01

### Added
- Initial release with 3D home visualization
- Build mode with wall drawing, floor plans, and room detection
- Home Assistant integration (WebSocket + REST proxy)
- Device markers with live state sync
- Standby mode with weather effects
- Multi-floor support
- GLB/GLTF model import
- Furniture props system
- Weather widget with location sync
- Energy monitoring widget
- Camera surveillance panel
- Vacuum robot control with room mapping
