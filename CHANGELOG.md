# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Detailed release notes for each shipped version should also be added as
`docs/patchnotes-vX.Y.Z.md`. See `docs/10-release-and-patchnotes.md`.

## [Unreleased]

### Changed
- **Scoped admin model** - hosted mode now separates everyday device control from administrative actions so normal dashboard use can stay smoother while settings, backups, project changes, raw HA proxy access, and security-sensitive HA domains remain protected.
- **Profile access clarity** - Profile now explains which actions work without admin unlock and which still require admin.
- **Hosted reconnect hardening** - hosted live sync now tracks degraded fallback mode, restores stream sync more deliberately after disconnects, and surfaces transport/sync status in system status.

### Verified
- **Phase 1 verification** - `npm test`, `npm run lint`, and `npm run build` were run successfully after the access model update.
- **Phase 2 verification** - hosted reconnect changes were verified with `npm test`, `npm run lint`, and `npm run build`.

## [1.8.2] - 2026-03-22

### Changed
- **Settings structure cleanup** - `Inställningar` is now grouped into clearer internal modules with faster in-page navigation and less long-form feeling.
- **Graphics workspace cleanup** - `Grafik & Miljö` now behaves more like a scene control workspace, with a clearer preview-first structure and better grouping of rendering, sun/weather, and environment controls.

### Preserved
- **Standby camera tools** - saving the current standby camera view and previewing standby mode remain intact, with the live 3D preview still visible while choosing the angle.
- **Graphics preview workflow** - the 3D preview remains available in the graphics section so changes can still be seen before saving.

## [1.8.1] - 2026-03-22

### Added
- **Hosted admin protection** - optional admin-PIN with hashed storage, session-based unlock, profile-integrated login flow, and recovery by clearing the stored PIN hash from persistent config.
- **Hosted live sync hub** - server-side Home Assistant live snapshot and event streaming for add-on and hosted deployments, with fallback recovery instead of constant full polling.

### Changed
- **Settings clarity** - admin login and access status are now surfaced under Profile in Settings so hosted and add-on setup is easier to understand during release testing.
- **Release documentation** - repository docs and add-on docs now reflect hosted live sync, protected settings, and current versioning.

### Fixed
- **Hosted backup restore** - full backup import now restores through the server data layer instead of only replacing in-browser state.
- **Server path safety** - project and asset file paths are validated against allowed storage roots before read, write, upload, or delete operations.
- **Quality gate parity** - lint configuration and CI steps now match the real repo workflow by running lint, tests, and build.

## [1.8.0] - 2026-03-18

### Fixed
- **Build-breaking missing module** — `RoomWallSurfaces3D` component inlined into `Walls3D.tsx` to eliminate persistent GitHub sync issue where the standalone file was not tracked, causing Rollup module resolution failure in CI builds.

### Changed
- Version bumped to 1.8.0 across `package.json`, `server/package.json`, `config.yaml`, README badge, and documentation.

## [1.7.3] - 2026-03-15

### Added
- **New device type: Egg** — new `egg` device kind under Robot category with gold marker. No Home Assistant domain mapping (standalone device).

### Fixed
- **FPS strafe direction** — A/D strafing corrected (A = left, D = right).

## [1.7.2] - 2026-03-15

### Fixed
- **3D media screen restored** — placing a "Skärm" device now correctly saves kind as `media_screen` (was `media-screen` due to tool key mismatch), restoring the full 3D monitor with Spotify/Now Playing visualization.
- **Legacy device migration** — existing projects with `media-screen` markers are auto-migrated to `media_screen` on load.
- **Bibliotek import persistence** — imported 3D models now reliably appear in the library after import; base64 encoding is awaited before closing the dialog, and the asset is auto-selected with correct filters applied.

## [1.7.1] - 2026-03-15

### Fixed
- **Device inspector icons** — each device type now shows its correct icon (speaker, fan, sensor, etc.) instead of defaulting to a lightbulb.
- **Selection cleared on mode exit** — switching away from Design mode now deselects all rooms, walls, devices and props, preventing stale selection outlines in Home/Dashboard views.
- **Bibliotek import** — clicking "Importera" in Library now directly opens the file picker instead of requiring an extra click inside the dialog.

## [1.7.0] - 2026-03-15

### Changed
- Version bump to 1.7.0 across all packages, server, HA add-on config and documentation.

## [1.6.3] - 2026-03-15

### Fixed
- **Wall corner cubes removed** — eliminated `generateCornerBlocks` entirely; walls now overlap slightly at junctions (trim factor 0.5 → 0.35) for seamless, invisible corners without extra geometry clipping through furniture.

## [1.6.2] - 2026-03-15

### Fixed
- **Wall corner artifacts** — corner blocks now use padded convex hulls with `DoubleSide` material and increased polygon offset to eliminate dark cubes and gaps at wall junctions.
- **Sun too far from building** — reduced sun distance from 20 to 12 units for more dramatic, game-like lighting with minimum height clamped to prevent underground sun.
- **Graphics settings not remounting Canvas** — Canvas key now includes quality, shadows, antialiasing, and tone mapping, ensuring a full WebGL remount when settings change.
- **Dashboard 3D preview too large** — reduced Hem category 3D widget height from 280px to 200px.

### Verified
- **Media screen 3D rendering** — `MediaScreenMarker` with `CanvasTexture` + `useFrame` scanline animation is correctly wired in both PersistentScene3D and DashboardPreview3D.
- **Bibliotek import flow** — file picker, analysis pipeline, optimization, and catalog storage all function correctly.
- **Weather/sun sync** — dashboard and design mode share the same Zustand store for environment state; all changes are automatically synced.
- **HA bridge** — all 18 device domains properly connected with bidirectional state sync and suppression logic.
- **Heal walls button** — `BuildTopToolbar` wrench button invokes `healWalls()` + `detectRooms()` correctly.

## [1.6.1] - 2026-03-15

### Fixed
- **Saved camera view lost on reload** — preset effect in `InteractiveCameraController` no longer overwrites `customStartPos` with the default `angle` preset on initial mount.
- **Dashboard save captures wrong camera** — `DashboardPreview3D` now exposes its own camera state via a ref; the save handler reads from the widget camera instead of the hidden persistent canvas camera.

## [1.6.0] - 2026-03-15

### Added — Persistent 3D Runtime (Phase 1–3)
- **Centralized Model & Texture Cache** (`src/lib/modelCache.ts`) — singleton cache with reference counting and LRU eviction (max 50 models / 2M triangles). Repeated model instances no longer trigger repeated parsing/loading.
- **Persistent 3D Canvas** (`src/components/PersistentScene3D.tsx`) — single `<Canvas>` mounted at root, survives mode switches (Home → Design → Standby) without destroying WebGL context or reloading GPU resources.
- **Unified Scene Content** — dynamic lighting, environment, and camera systems adapt to `appMode` within the persistent canvas.
- **WebGL Context Recovery** — automatic recovery with exponential backoff (max 3 retries) on context loss; model cache cleared on recovery.
- **Build Camera FlyTo** — smooth lerp-based camera transitions for room navigation in Design mode.

### Added — Rendering Optimization (Phase 3.5)
- **Adaptive Frame Throttle** — `FrameThrottle` component inside Canvas reduces GPU load: ~10fps in Standby, fully paused in Vio mode, full speed in Home/Build.
- **Render mode indicator in HUD** — shows FULL / ~10FPS / PAUSED / HIDDEN status.

### Added — UX
- **Branded Loading Screen** — BjorQ logo + progress bar with status messages ("Förbereder hemmet…") at app startup.
- **Cache Stats in Performance HUD** — model count, triangle count, and texture count displayed in real-time.

### Fixed
- **Design mode camera locked** — BuildModeV2 overlay blocked pointer events to the persistent Canvas; fixed with `pointer-events-none` on root + `pointer-events-auto` on interactive children.
- **Dashboard 3D view missing** — persistent canvas was incorrectly hidden in dashboard mode; now visible as background.
- **2D map missing in Design mode** — BuildCanvas2D container lacked proper sizing (`absolute inset-0`); fixed.
- **Redundant WebGL contexts** — removed Scene3D imports from DashboardView and DashboardGrid that created extra canvases.

### Removed
- **`Scene3D.tsx`** — consolidated into PersistentScene3D (~450 lines removed).
- **`BuildScene3D.tsx`** — consolidated into PersistentScene3D (~700 lines removed).

### Changed
- Dashboard background is now transparent when `dashboardBg === 'scene3d'`, letting the persistent canvas show through.
- Version bumped to 1.6.0.


## [1.5.3] - 2026-03-15

### Fixed
- **Platt solljus / överexponerade väggar** — justerad CLEAR-profil med högre riktningsljus (1.4×) och lägre ambient/hemisphere för bättre kontrast och djup i 3D-scenen
- **3D-modeller som inte tar emot omgivningsljus** — automatisk korrigering av extrema PBR-materialvärden (metalness > 0.95, roughness < 0.05) vid import
- **Emissive-highlight vid markering** — borttagen emissive-glow, ersatt med blå wireframe-box (#4a9eff) med tjockare linjer för tydligare markering utan att dölja färg
- **Möbler genomtränger golvet** — freePlacement sätts nu som default, floor-clamping appliceras korrekt, och long-press "Fri"-knappen fungerar nu
- **Kamera snäpper tillbaka vid lägeshyte** — kameran bevarar sin position vid byte mellan Design och Hem
- **Väderpartiklar pulserar** — jämn Y-fördelning vid spawn, hastighetsvariation per partikel (±20%), gradual count-ändringar

### Added
- **Duplicera-knapp i enhetsinspektör** — kopiera enheter med offset direkt i Build-inspektören
- **3D-förhandsvisning i Grafik & Miljö** — live 3D-vy visas ovanför inställningarna så man ser effekten direkt
- **Filtrerad enhetsmarkör-visning** — bara enheter med generiska markörer (hjälpsfärer) kan döljas; enheter med 3D-modeller (ljusarmaturer, speakers etc.) visas alltid

### Changed
- Ögonikon för enhetsmarkörer förstorad (20px, knapp 48px)
- Yta- och Kategori-fält borttagna från enhetsinspektören (redan synligt i biblioteket)
- Skugginställningar förbättrade: större shadow-camera frustum, lägre bias för skarpare skuggor

## [1.5.2] - 2026-03-14

### Added
- **Transparent hjälpsfär för ljusarmaturer i designläge** — alla ljusarmaturer (led-bulb, led-bar, led-spot, led-gu10) renderar nu en ljusblå semi-transparent sfär (radie 0.09, 20 % opacity) i Build-läge för bättre synlighet och enklare markering

## [1.5.1] - 2026-03-14

### Added
- **LED Spotlight (GU10) ljusarmatur** — ny `led-gu10` fixtureModel med konisk metallkropp, emissiv lins och dubbla GU10-pinnar; använder riktad spotLight med angle π/8 och penumbra 0.4

### Fixed
- **Long-press popup on short click** — added `clickHandled` ref guard so the 500ms timer callback aborts if a regular click was already processed; prevents popup from opening on quick taps

## [1.4.0] - 2026-03-14

### Added
- **Per-device light properties** — customize intensity, range, cone angle, and penumbra individually for each light in the Build Inspector
- **Save camera view** — double-click the 3D widget in the Dashboard to save the current camera position as default start view
- **Long-press on 3D markers** — 500ms long-press on any device marker in Home view opens the device control popup (same as device cards)

### Fixed
- **Light fixtures not toggling** — older light-fixture devices with stale `generic` state now auto-migrate to proper `LightState` on render, enabling on/off control in Home view
- **Long-press triggering immediately** — long-press timer now correctly cleared on click to prevent instant popup on tap
- **LED-bar defaults** — updated to intensity 0.5×, distance 1.4m, angle 118°, penumbra 0.70 for more realistic lighting

## [1.3.0] - 2026-03-14

### Fixed
- **Enheter auto-placement** — Clicking "Enheter" no longer immediately enters light placement mode; a neutral `devices` tool opens the panel without placing on click
- **Models below floor** — Y position clamped to ≥ 0 in device inspector height slider
- **Wall corner geometry** — L-corners (2-wall junctions) now generate convex hull corner fill blocks; miter offset clamping tightened from 0.4 to 0.35 to reduce corner gaps

### Added
- **New light types** — `ceiling-small` (half-sized ceiling light) and `lightbar` (directional bar with spotlight)
- **Ljusarmatur device type** — New `light-fixture` kind with 3 procedural 3D models: LED Bulb (E27 scale), LED Bar (frosted diffuser), LED Spot (puck-style)
- **Smart Outlet (Vägguttag)** — New `smart-outlet` device under "Kontakter" category with wall-mounted 3D model and green status LED
- **Multi-entity HA warning** — Inspector shows warning when multiple devices share the same HA entity; HAEntityPicker allows linking (no longer disabled for shared entities)
- **Fixture model selector** — Device inspector shows armature model picker for light-fixture devices

### Changed
- Device placement tools panel defaults to no category expanded (prevents accidental placement)
- "Kontakter" added as new device category in placement tools

## [1.2.1] - 2026-03-14

### Fixed
- **Bibliotek import** — Imported models now correctly include thumbnail, dimensions, performance stats, subcategory, and base64 persistence for offline use
- **Wizard thumbnails** — Stale synced wizard models with expired blob URLs now fall back to the Wizard API thumbnail endpoint
- **Placement per-model** — Placement type (Golv/Vägg/Tak/Bord/Fri) is now respected per-model instead of being overridden by category; explicit placement field takes priority over category defaults

### Added
- **Free placement type** — New "Fri" (free) placement option allows models to bypass wall barriers and mount logic entirely
- Free placement option added to Bibliotek metadata editor, catalog manage dialog, and placement filter

## [1.2.0] - 2026-03-14

### Added
- **Hemvy restored** — Full-screen 3D home view (HomeView) is back as a separate mode alongside the control panel (DashboardShell)
- **Build mode navigation** — Home (🏠) and Dashboard (📊) buttons in Build toolbar for quick switching between all three modes
- **Hemvy link in nav rail** — Control panel sidebar includes a "Hemvy" shortcut to jump to full-screen 3D view

### Changed
- "Klar" button in Build mode now navigates to the control panel (dashboard) instead of home view
- Renamed "Hem" to "Hemvy" in the control panel nav rail for clarity

## [1.1.0] - 2026-03-14

### Added
- **Unified Dashboard Shell** — new vertical nav rail (120px) replaces bottom tab bar; all categories accessible from left sidebar
- **3D View as Widget** — 3D preview is now a draggable widget card in the Home grid, allowing other widgets to flow below it
- **Room-based device grouping** — lights automatically grouped by room name instead of generic "Ljus" category
- **Drag-to-reorder widgets** — touch-friendly long-press edit mode with wobble animation and pointer-based reordering
- **Standby 3D preview** — live Scene3D preview in Standby settings for camera angle visualization
- **Category management** — create custom device categories with drag-and-drop device assignment between categories

### Changed
- Dashboard layout uses full-width content flow instead of fixed 2-column 3D split
- "Redigera", "Hantera kategorier", and "Klar" buttons unified on same toolbar row
- Default camera angle moved closer (8,7,8) for better visibility in compact dashboard widget
- Nav rail background unified with page background color
- Device name text truncation improved to prevent names from disappearing in narrow cards

### Fixed
- Device names truncated to invisible in CategoryCard when slider and switch occupied too much space
- Widgets could not appear below the 3D view due to rigid 2-column grid layout

## [1.0.8] - 2026-03-11

### Added
- **Möbler-flik drag** — Props kan nu markeras och flyttas direkt i Möbler-fliken (2D & 3D) utan att byta till Välj-verktyget.
- **Wizard-ikon** — Importerade Wizard-modeller visas med en liten trollstavsikon (🪄) i möbelkatalogen.

### Changed
- **Wizard-flik rensat** — Importera-knapp och käll-/kategorifilter dolda i Wizard-vyn för enklare gränssnitt.

### Fixed
- **Högerklick på enheter blockerat** — Kontextmeny förhindras på alla enhetsmarkörer i 3D-vyn.

## [1.0.7] - 2026-03-11

### Added
- **Wizard dock button** — Dedicated "Wizard" button in Build Mode bottom dock (between Möbler and Enheter) for quick access to Wizard asset catalog with pre-set filter.

### Fixed
- **Server crash loop in Docker** — Hardcoded `APP_VERSION` constant prevents `ENOENT` crash when `package.json` is unavailable in runtime container (fix was in 1.0.6 source but required rebuild).

## [1.0.6] - 2026-03-11

### Changed
- **Removed Sync mode** — Wizard assets now use import-only workflow. All assets are downloaded and stored locally, eliminating runtime dependency on Wizard. Existing synced assets show a warning badge and re-import on click.

### Fixed
- **Assets survive Wizard deletion** — Imported assets are fully independent with locally stored model data and base64 thumbnails.
- **Asset deletion working** — Delete button now appears on all user and imported assets (including Wizard-imported). Confirmation dialog added; placed instances are also removed.
- **Duplicate assets on sync** — Clicking an already-imported Wizard asset now places a new instance instead of creating a duplicate catalog entry.
- **Thumbnails persist across sessions** — Wizard thumbnails are converted to base64 data URLs during import instead of using expiring blob URLs.
- **Ghost placement bug** — Eliminated by removing the dual-mode sync path that created conflicting state.

### Removed
- Wizard dual-mode action dialog ("Använd synkad" / "Importera till Dashboard")
- `handleWizardSync` function and all `wizardMode === 'synced'` code paths

## [1.0.5] - 2026-03-10

### Fixed
- **Wizard thumbnails missing** — Assets from Wizard now always fall back to the direct `/assets/:id/thumbnail` endpoint when the catalog index doesn't include a thumbnail path.

### Improved
- **Asset catalog redesign for scale** — Grouped by source (Wizard / Mina / Katalog) with collapsible sections, left-border color indicators (orange = Wizard, blue = user/imported), grid/list view toggle, and sticky category filters. Handles 30-50+ models cleanly.

## [1.0.4] - 2026-03-10

### Fixed
- **Wizard catalog returns 0 assets** — `fetchWizardCatalog` now tries `/catalog/index` first (full manifest), with fallback to `/libraries/:lib/index`. Errors are logged via `console.warn` instead of silently swallowed.

## [1.0.3] - 2026-03-10

### Fixed
- **Wizard connection lost on restart** — Wizard state (URL, status, version) was saved to server but never restored on bootstrap. Now persisted in both hosted mode and localStorage (DEV mode).
- **No auto-reconnect** — Dashboard now auto-verifies Wizard connection on startup if a URL is configured, and fetches the catalog silently.

### Improved
- **WizardConnectionPanel UX** — Shows asset count on connect, added Reconnect/Refresh/Reset action buttons (mirrors HA panel pattern).

## [1.0.2] - 2026-03-10

### Fixed
- **Wizard catalog fetch** — Dashboard fetched library names instead of actual assets from Wizard API. Now correctly calls `/libraries/:lib/index` to retrieve individual model entries.

## [1.0.1] - 2026-03-10

### Fixed
- **Server crash in Docker** — `backups.js` attempted to read `package.json` via `import.meta.url`, which doesn't exist in the runtime Docker image. Replaced with hardcoded version constant.

## [1.0.0] - 2026-03-10

### 🎉 First Stable Release

BJORQ Dashboard reaches v1.0.0 — a fully featured 3D smart home dashboard for Home Assistant.

### Added
- **Onboarding guide** — new `ONBOARDING.md` with step-by-step setup instructions
- **Asset Wizard API alignment** — routes updated to match actual Wizard endpoints (`/libraries`, `/assets/:id/model|thumbnail`)
- **Wizard cache invalidation** — catalog cache clears automatically when Wizard URL changes
- **Wizard documentation** — added to Settings table and roadmap (Phase 12)

### Fixed
- **XSS vulnerability** in error fallback (`main.tsx`) — replaced `innerHTML` with safe `textContent`
- **HA proxy double-fetch** for camera streams — eliminated redundant network request
- **Backup version hardcoded** to `0.1.5` — now reads dynamically from `package.json`
- **Duplicate settings rows** in documentation (WiFi, Widgetar, Data & Backup listed twice)

### Changed
- Wizard connection placeholder updated to port `3500` (matching actual Wizard add-on)
- Roadmap updated with Phase 11 (Consolidated Graphics) and Phase 12 (Asset Wizard Integration)
- README documentation table now includes onboarding guide link

## [0.7.3] - 2026-03-10

### Added
- **Wizard dual-mode assets** — choose between Synced (live reference to Wizard) or Imported (local copy in Dashboard) when placing Wizard assets
- Action dialog when selecting a Wizard asset with "Använd synkad" and "Importera till Dashboard" options
- Visual badges on asset cards: "Wizard", "Synced", "Imported" to distinguish asset sources
- `downloadWizardModel()` and `downloadWizardThumbnail()` helpers in wizardClient for import flow
- `getWizardThumbnailUrl()` dedicated thumbnail endpoint helper
- `wizardAssetId`, `wizardBaseUrl`, `wizardMode`, `wizardMeta` fields on `PropCatalogItem` for dual-mode tracking
- Imported Wizard assets persist independently — Wizard no longer required after import
- Synced assets always fetch latest model from Wizard on placement

### Changed
- Source filters updated: "Wizard" shows synced + live catalog; "Mina" shows imports including imported Wizard assets
- Already-imported Wizard assets no longer duplicate in the Wizard catalog view
- Asset cards now show Wand2 icon for Wizard-related entries instead of generic User/Archive icons

### Fixed
- Wizard catalog entries deduplication — imported assets excluded from live Wizard listing

## [0.7.2] - 2026-03-09

### Added
- **BJORQ Asset Wizard integration** — connect to the Wizard add-on and use Wizard-processed assets directly in the furniture workflow
- `WizardConnectionPanel` in Settings → Anslutning — configure Wizard URL, test connection, view version
- `wizardClient.ts` — API client for Wizard health checks, catalog fetching, and model loading (ingress-safe)
- Wizard source filter (`✨ Wizard`) in the AssetCatalog alongside existing Katalog/Mina filters
- Wizard assets appear with thumbnails, dimensions (from `boundingBox`), triangle counts, and category/subcategory
- Smart placement using Wizard metadata: `estimatedScale` for initial scale, `center` for floor-level alignment
- `WizardConnection` state slice in Zustand store with server profile sync

### Fixed
- `FurnishTools.tsx` referencing non-existent `./AssetCatalog` module (AssetCatalog is inlined in BuildModeV2)

## [0.7.1] - 2026-03-08

### Added
- **Live camera snapshot polling** — real snapshots from HA cameras via `camera_proxy` with 5-second refresh in both hosted and DEV modes
- `useCameraSnapshot` reusable hook with dual-mode fetching (server proxy blob in hosted mode, direct `<img>` URL in DEV mode to bypass CORS)
- `entityId` field on `CameraState` for canonical camera entity identification
- `CompactCameraCard` sub-component — live camera thumbnails in Home view widget strip
- `CameraCard` and `ExpandedCamera` sub-components in SurveillancePanel with real snapshot rendering

### Fixed
- Camera snapshots failing in DEV mode due to CORS — switched to direct `<img>` URL using HA's signed `entity_picture` path
- Compact camera widgets showing static placeholder icon instead of live snapshot (hooks can't be called in conditional inline code — extracted to sub-component)

## [0.7.0] - 2026-03-08

### Added
- **Selective shadow casting** on imported 3D models — opaque meshes cast shadows while glass/window materials let sunlight through, creating realistic indoor light patterns
- Glass detection heuristic: checks `material.transparent`, `opacity < 0.9`, and name patterns (`glass`, `window`, `glas`, `fönster`)
- **Consolidated Graphics & Environment view** — "Grafik & Miljö" in Settings now has 3 collapsible sections: Rendering, Sol & Väder, Miljö & Terräng
- **Reactive environment profile** — sun/weather changes instantly update the 3D scene via `recomputeEnvProfile`
- **SunWeatherPanel** — unified panel replacing separate SunCalibrationPanel and WeatherAtmospherePanel

### Removed
- `SunCalibrationPanel.tsx` — superseded by SunWeatherPanel
- `WeatherAtmospherePanel.tsx` — superseded by SunWeatherPanel

### Fixed
- React ref warnings on CollapsibleSection and EnvironmentPanel (wrapped with `React.forwardRef`)

## [0.6.1] - 2026-03-08

### Fixed
- WebGL context loss now recovers with exponential backoff (max 3 retries) instead of infinite loop
- Dashboard 3D background missing when `dashboardBg` setting was undefined (added fallback)
- `require()` calls in scene activation replaced with ESM imports (fixes production builds)
- "Function components cannot be given refs" warnings for MediaScreenMarker and CameraController

### Added
- "Återställ standard" button in Graphics Settings — resets all rendering options and re-enables 3D background
- Static fallback UI with "Försök igen" button when WebGL context cannot be restored

## [0.6.0] - 2026-03-08

### Added
- **Build Project Persistence System** — full save/export/import for build projects
- `BuildProject` schema with versioning (`schemaVersion: 1`) for portable project files
- **Project Export** — export entire build (layout, devices, props, terrain, metadata) as `.json`
- **Project Import** — import with schema validation, migration support, and preview dialog showing stats
- **ProjectManagerPanel** — new UI card in Settings → Data for save/export/import actions
- `projectIO.ts` — export/import utilities with stats calculation
- `projectMigrations.ts` — versioned migration system for future schema evolution
- Terrain and comfort state now correctly persisted in server sync and bootstrap load

### Fixed
- `terrain` and `comfort` data no longer silently lost on server restart in hosted mode
- Server sync subscriber now watches `terrain` changes alongside layout/devices/homeGeometry/props

### Changed
- Version bump to 0.6.0

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
