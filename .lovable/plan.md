

# Patch v0.7.1 — Camera Snapshots Release

## Changes

### 1. `package.json` line 4
Version `0.7.0` → `0.7.1`

### 2. `bjorq_dashboard/config.yaml` line 3
Version `0.6.1` → `0.7.1`

### 3. `README.md` line 4
Badge `0.7.0` → `0.7.1`

### 4. `CHANGELOG.md` — insert new section before `[0.7.0]`

```markdown
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
```

### 5. `docs/03-using-the-dashboard.md` line 36
Change:
```
- **Övervakning** — Camera feeds (if configured)
```
To:
```
- **Övervakning** — Live camera snapshots with 5-second polling, expandable full-screen view, motion sensor status, and activity log
```

### 6. `docs/08-developer-notes.md` — add hook docs

Add after the hooks section a line documenting `useCameraSnapshot`:
```
- **useCameraSnapshot(entityId, enabled, entityPicture?, intervalMs?)** — Polls camera snapshots. Hosted mode fetches blob via `/api/ha/camera_proxy/{entityId}`. DEV mode constructs direct `<img>` URL from `entity_picture` to bypass CORS. Returns blob/image URL or null.
```

