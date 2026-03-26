

# Full System Audit — BJORQ Dashboard

## Scope

End-to-end verification of every subsystem: UI → state → API → HA/Wizard → persistence → reload. Work in small, reviewable diffs per phase.

## Pre-condition: Stabilization (Phase 0)

Before any functional audit, get all checks green:
- `npx tsc -p tsconfig.app.json --noEmit`
- `npm run lint`
- `npm test`
- `npm run build`

Fix any TypeScript errors, lint warnings, and failing tests found. This establishes a clean baseline.

---

## Phase 1: HA + Live Sync Audit

**Files:** `src/hooks/useHomeAssistant.ts`, `src/lib/apiClient.ts`, `server/ha/liveHub.js`, `server/api/live.js`, `src/store/useAppStore.ts` (HA slice)

**Verify:**
- DEV mode: direct WebSocket connect → auth → get_states → subscribe_events → live updates
- HOSTED mode: EventSource `/api/live/events` → snapshot/entity-update/ha-status/segment-map events
- Fallback polling: heartbeat timeout (45s) → fallback poll (10s) → reconnect stream
- Service calls: DEV uses WS `call_service`, HOSTED uses `POST /api/live/service`
- `setHAStatus`, `markHASync`, `setHATransport` — status transitions are correct
- Reconnect logic (both client WS and server liveHub backoff)
- `haServiceCaller` throttle is properly wired in both modes

**Known risk:** `initHostedMode` sets transport to `live-stream` but no token — verify no WS auto-connect fires in hosted mode.

---

## Phase 2: Vacuum Audit

**Files:** `server/ha/liveHub.js` (`refreshVacuumMap`, `parseVacuumSegmentMap`), `src/hooks/useHomeAssistant.ts` (segment-map event), `src/components/home/cards/RobotPanel.tsx`, `src/components/build/devices/VacuumMappingTools.tsx`, `src/store/useAppStore.ts` (vacuum actions), `src/store/types.ts` (VacuumZone, VacuumMapping)

**Verify the full chain:**
1. Server: `liveHub.connect()` → gets states → finds `vacuum.*` → calls `roborock.get_maps` → parses segment map → broadcasts `segment-map` event
2. Client: receives `segment-map` → `setVacuumSegmentMap()` → stored in `homeAssistant.vacuumSegmentMap`
3. VacuumMappingTools: reads `vacuumSegmentMap`, shows dropdown with segment options per zone
4. RobotPanel: `getZoneSegmentId()` resolves zone.segmentId → fallback to name lookup in vacuumSegmentMap
5. Room cleaning: `app_segment_clean` with correct `segments: [segId]`

**Known issues to check:**
- `parseVacuumSegmentMap` handles both array-of-rooms and object-keyed-rooms formats
- Name matching between BJORQ rooms and HA room names (case-insensitive?)
- What happens when segment map is empty (no Roborock service)
- Zone persistence: `vacuumMapping` is on Floor → saved in project → survives reload?
- `segmentId` on zone persists through project save/load cycle

---

## Phase 3: Persistence & Sync Audit

**Files:** `src/store/useAppStore.ts` (partialize, onRehydrate, subscribe auto-sync, initHostedMode), `src/lib/apiClient.ts` (save/fetch functions), `server/api/profiles.js`, `server/api/projects.js`, `server/api/bootstrap.js`, `server/api/backups.js`

**Verify for DEV mode:**
- `partialize` includes all necessary slices: layout, devices, props, homeGeometry, profile, standby, homeView, environment, calendar, automations, savedScenes, customCategories, wifi, energyConfig, wizard, dashboard, activityLog, comfort
- Missing from partialize? Check: `comfort`, `dashboard`, `performance` — these may be lost on reload in DEV mode
- `onRehydrate` migration: media-screen → media_screen, boolean deviceStates → structured

**Verify for HOSTED mode:**
- `partialize` returns `{}` (no localStorage)
- `syncProfileToServer()` sends: profile, performance, standby, homeView, environment, customCategories, wifi, energyConfig, calendar, automations, savedScenes, wizard, dashboard
- Missing from profile sync? Check: `comfort` — comfort rules may not persist in hosted mode!
- `syncProjectToServer()` triggered by changes to: layout, devices, homeGeometry, props, terrain
- Missing from project sync? Check: `activityLog` — included in `buildHostedProjectPayload` ✓
- Bootstrap load: all profile/project fields properly applied

**Backup/restore:**
- Backup envelope includes: config, profiles, projects
- Restore applies profiles + projects + config correctly
- Reset clears projects and resets profiles to defaults

---

## Phase 4: Dashboard / Theme / Display / Standby Audit

**Files:** `src/hooks/useThemeEffect.ts`, `src/components/home/cards/ThemeCard.tsx`, `src/components/home/DashboardShell.tsx`, `src/components/home/DashboardGrid.tsx`, `src/components/standby/StandbyMode.tsx`, `src/components/standby/useIdleTimer.ts`, `src/components/home/cards/DisplaySettings.tsx`, `src/components/home/cards/GraphicsSettings.tsx`

**Verify:**
- Theme presets (dark/midnight/light/nordic) apply correct CSS variables
- Custom colors (8 types) apply and persist: buttonColor, sliderColor, bgColor, menuColor, cardColor, textColor, textSecondaryColor, borderColor
- `savedThemes` save/load/delete cycle works
- `dashboardBg` (scene3d/gradient/solid) + `sceneOverlayColor` work
- Section-specific accents (energy/climate/weather) render correctly
- Standby: idle timer → enterStandby → exitStandby → phase transitions (standby → vio)
- Widget layout persistence (position/size for clock/weather/temp/energy)
- Category order and density persistence
- All display settings actually affect rendering

---

## Phase 5: Wizard / Assets / Import Audit

**Files:** `src/lib/wizardClient.ts`, `src/lib/catalogLoader.ts`, `src/lib/assetPipeline.ts`, `src/components/build/furnish/FurnishTools.tsx`, `src/components/build/import/ImportTools.tsx`, `src/lib/apiClient.ts` (uploadPropAsset, ingestToCatalog)

**Verify:**
- Wizard connection test → status update → catalog fetch
- Thumbnail loading (wizard URL construction, fallback)
- Model download → import → base64 persistence (< 4MB)
- Catalog item metadata editing
- Props placement → persist → reload (base64 reconstitution in Props3D)
- Hosted mode: server-side asset upload pipeline
- `wizardMode: 'synced'` → staleSync handling

---

## Phase 6: Build Mode / 2D / 3D Audit

**Files:** `src/components/build/BuildModeV2.tsx`, `src/components/build/BuildCanvas2D.tsx`, `src/components/build/Walls3D.tsx`, `src/components/build/Props3D.tsx`, `src/components/build/BuildInspector.tsx`, `src/components/build/MaterialsPanel.tsx`, `src/components/build/FloorManager.tsx`, `src/components/devices/DeviceMarkers3D.tsx`

**Verify:**
- Wall drawing → room detection → room persistence
- Opening placement and persistence
- Props placement, movement, rotation, scale — persist through reload
- Device marker placement → room auto-assignment → HA entity linking
- Material application (floor/wall per room)
- Undo/redo stack
- Import overlay sync
- Floor management (add/remove/rename)
- 2D ↔ 3D mode switch consistency
- Model import (GLB/GLTF) → persist (base64 or server upload)

---

## Deliverables per phase

For each phase:
1. List files inspected
2. List bugs/broken connections found
3. Minimal fix diffs
4. Tests added where regression risk is high
5. Confirm which save/load flows verified
6. Note remaining risks

## Work order

Phases are sequential. Each phase produces a small, reviewable set of changes. No large refactors.

**Critical early finding from code review:**
- `comfort` state is NOT included in `syncProfileToServer()` (line 84-99) — comfort rules will be lost in hosted mode on server restart. This needs fixing.
- `comfort` is also NOT in `partialize` (line 1745-1775) — comfort rules are lost on reload in DEV mode too.
- `performance` is NOT in `partialize` — performance settings lost on reload in DEV mode (but saved via `syncProfileToServer` in hosted mode).
- `dashboard` is NOT in `partialize` — dashboard category/density lost on DEV reload.

These are real bugs that will be fixed in Phase 3.

