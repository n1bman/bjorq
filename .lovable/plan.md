

# Patch Release 0.6.1 — Bugfixes & Cleanup

## Issues Found

### 1. `require()` calls in store (will crash in production)
`src/store/useAppStore.ts` lines 327 and 336 use CommonJS `require('../lib/cameraRef')` inside the scene activation logic. This will fail in Vite production builds (ESM only). Must replace with direct imports — `flyTo` and `cameraForPolygon` are already exported from `src/lib/cameraRef.ts`.

### 2. Console warnings: "Function components cannot be given refs"
- **`MediaScreenMarker`** in `DeviceMarkers3D.tsx` — R3F's reconciler tries to pass a ref. Wrap with `React.forwardRef`.
- **`CameraController`** in `Scene3D.tsx` — same issue. Wrap with `forwardRef`.
- **`Environment`** from drei — external library, cannot fix. Harmless.

### 3. Changelog + version bump
Today's session fixed WebGL context recovery, added graphics reset, fixed dashboard fallback. This needs to be documented as **0.6.1** patch.

## Changes

### `src/store/useAppStore.ts`
Replace `require('../lib/cameraRef')` calls (lines 327, 336) with the already-available top-level import. Add `import { flyTo, cameraForPolygon } from '../lib/cameraRef'` at the top of the file (if not already there) and use them directly.

### `src/components/devices/DeviceMarkers3D.tsx`
Wrap `MediaScreenMarker` function component with `React.forwardRef` to suppress the ref warning. The ref can be forwarded to the root `<group>`.

### `src/components/Scene3D.tsx`
Wrap `CameraController` with `React.forwardRef` for the same reason.

### `CHANGELOG.md`
Add `[0.6.1]` entry above `[0.6.0]`:

```
## [0.6.1] - 2026-03-08

### Fixed
- WebGL context loss now recovers automatically with exponential backoff (max 3 retries) in both Home and Build scenes
- Infinite WebGL recovery loop — capped retries with fallback UI ("Försök igen" button)
- Dashboard 3D background missing when `dashboardBg` setting was undefined (added fallback)
- `require()` calls in scene activation replaced with ESM imports (fixes production builds)
- "Function components cannot be given refs" warnings for MediaScreenMarker and CameraController

### Added
- "Återställ standard" button in Graphics Settings — resets all rendering options and re-enables 3D background
- Static fallback UI when WebGL context cannot be restored after 3 attempts
```

### `package.json`
Bump `"version"` from `"0.6.0"` to `"0.6.1"`.

### `bjorq_dashboard/config.yaml`
Bump `version` from `"0.6.0"` to `"0.6.1"`.

## Files Summary

| File | Change |
|------|--------|
| `src/store/useAppStore.ts` | Replace `require()` with ESM import |
| `src/components/devices/DeviceMarkers3D.tsx` | Wrap `MediaScreenMarker` with `forwardRef` |
| `src/components/Scene3D.tsx` | Wrap `CameraController` with `forwardRef` |
| `CHANGELOG.md` | Add 0.6.1 entry |
| `package.json` | Version → 0.6.1 |
| `bjorq_dashboard/config.yaml` | Version → 0.6.1 |

