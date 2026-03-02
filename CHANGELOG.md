# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
