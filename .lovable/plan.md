

## Plan: Phase 7 — 3D Lighting Engine + Light Type Behavior + Full Rotation

### 1. Light type affects 3D light source

Currently `LightMarker` always uses a `pointLight` regardless of `lightType`. Each type should emit light differently:

- **ceiling** — `pointLight` casting downward, moderate distance (8), decay 2 (current behavior)
- **strip** — `rectAreaLight`-like effect via a stretched mesh + wider `pointLight` with higher distance (10), lower intensity
- **spot** — `spotLight` with narrow angle (~30°), sharp cone, high intensity, supports X/Z rotation for aiming
- **wall** — `spotLight` with wider angle (~60°), medium distance, side-mounted wash effect
- **custom** — `pointLight` (same as ceiling, user controls all params)

Changes in `DeviceMarkers3D.tsx` `LightMarker`:
- Read `marker.lightType` (need to pass marker data into LightMarker)
- Switch light source type based on `lightType`
- Apply marker rotation to spotlight target direction
- Visual mesh shape changes: sphere for point lights, elongated box for strip, cone indicator for spot

### 2. Full XYZ rotation for ALL devices (not just screens)

Currently only `media_screen` gets XYZ rotation sliders; other devices get Y-only.

In `BuildInspector.tsx` `DeviceInspector`:
- Change rotation section to always show X and Y axes (at minimum) for all devices
- Lights especially need X and Z rotation to aim spotlights/wall lights
- Apply rotation in `LightMarker` group to orient the light source

### 3. Remove "Anpassad" (custom) light type, keep 4 types

Per user feedback, remove `custom` from the light type options. Update `LightType` in `types.ts`.

### 4. Improved shadow quality

In `Scene3D.tsx` and `BuildScene3D.tsx`:
- Enable `castShadow` on spotlights from light markers
- Ensure `receiveShadow` on ground/floor meshes (already done)

### Files modified

- `src/store/types.ts` — Remove `'custom'` from `LightType`
- `src/components/devices/DeviceMarkers3D.tsx` — Rewrite `LightMarker` to use different Three.js lights per type, accept rotation, pass marker data
- `src/components/build/BuildInspector.tsx` — XYZ rotation for all devices, remove "Anpassad" option
- `docs/roadmap-vNext.md` — Mark Phase 7 done

### Technical details

- `SpotLight` target requires a `target` object positioned relative to the group; we use `useRef` + `useFrame` to update the target position based on rotation
- Strip lights use an elongated emissive mesh + wider pointLight to approximate area lighting
- The marker's `rotation` field already stores `[x, y, z]` radians; currently only Y is set for non-screens. No schema change needed for rotation.

