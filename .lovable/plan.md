

# Plan: Design Mode Fixes + New Light/Device Types (v1.3.0)

This plan addresses 7 issues across device placement UX, floor clamping, wall geometry, new light types, light fixture 3D models, multi-entity HA support, and a new "Kontakter" device category.

---

## Task 1: Fix auto-placement when clicking "Enheter"

**Problem:** Clicking "Enheter" in the bottom toolbar sets `activeTool = 'place-light'`, which immediately enters light placement mode. One accidental click on the 3D canvas places a light.

**Fix:** Add a new `BuildTool` value `'devices'` (non-placing). The "Enheter" button sets tool to `'devices'`, which opens the DevicePlacementTools panel but does NOT place anything on click. The user must then explicitly select a device type (Ljus, Knapp, etc.) to enter placement mode.

**Files:**
- `src/store/types.ts` — add `'devices'` to `BuildTool` union
- `src/components/build/BuildModeV2.tsx` — change `inredningTools` entry from `place-light` to `devices`; update `isActive` check; show DevicePlacementTools when `activeTool === 'devices'` too
- `src/components/build/BuildScene3D.tsx` — ensure `'devices'` tool does NOT trigger device placement on canvas click (only `place-*` tools do)
- `src/components/build/devices/DevicePlacementTools.tsx` — default `openCategories` to empty set (no category pre-expanded)

## Task 2: Prevent models/devices from going below floor

**Problem:** Drag and position editing can push objects below Y=0 (or below floor elevation).

**Fix:**
- `src/components/devices/DeviceMarkers3D.tsx` — in drag handler `onPointerMove`, clamp Y to `>= floor.elevation` (currently `dragDeviceY` is preserved, but manual Y input can go negative)
- `src/components/build/BuildInspector.tsx` — in DeviceInspector position slider for Y, set `min={0}` (already done for the dedicated height slider, but the XYZ position sliders allow negative Y — clamp the Y slider to `min={0}`)
- `src/components/build/BuildScene3D.tsx` — in prop drag logic, clamp Y to `>= elevation`

## Task 3: Fix wall corner geometry

**Problem:** L-corners (2-wall junctions) show gaps/overlaps. The current system skips corner blocks for `connectionCount < 3` and relies on mitered geometry, but the miter offsets can produce visible gaps at certain angles.

**Fix:** In `generateCornerBlocks`, change the threshold from `connectionCount < 3` to `connectionCount < 2`. For 2-wall L-corners, generate a small convex-hull corner fill block just like T-junctions. This fills the gap that mitering alone cannot close at non-right angles. Additionally, ensure the miter offset clamping in `computeMiterOffsets` is tighter (reduce `maxOffset` from `len * 0.4` to `len * 0.35`) to prevent over-extension.

**Files:**
- `src/lib/wallGeometry.tsx` — lower `connectionCount` threshold to `< 2`, tighten miter clamping

## Task 4: Add new light types

**Current:** `LightType = 'ceiling' | 'strip' | 'wall' | 'spot'`

**New types:**
- `'ceiling-small'` — same as ceiling but half-sized sphere (0.05m radius vs 0.1m), reduced intensity/distance
- `'lightbar'` — similar shape to strip but directional: spotlight pointing down from a bar mesh, not 360-degree pointLight

**Files:**
- `src/store/types.ts` — extend `LightType` to include `'ceiling-small' | 'lightbar'`
- `src/components/devices/DeviceMarkers3D.tsx` — add rendering branches for `ceiling-small` (smaller sphere + reduced pointLight) and `lightbar` (box mesh 0.4x0.02x0.04 + spotLight pointing down)
- `src/components/build/BuildInspector.tsx` — add to `lightTypeOptions`: `{ value: 'ceiling-small', label: 'Tak Liten', emoji: '🔹' }` and `{ value: 'lightbar', label: 'Lightbar', emoji: '▬' }`

## Task 5: New device type "Ljusarmatur" with 3D models

Add a new `DeviceKind = 'light-fixture'` for physical light fixture bodies that emit light. Three procedural 3D models:

### 5.1 LED Bulb
- Sphere body (radius ~0.03m) on a cylindrical base (radius ~0.013m, height ~0.04m), realistic E27 scale
- Emissive top half, metallic base
- PointLight attached, intensity from HA state

### 5.2 Linear LED Bar
- Box mesh (0.6m x 0.02m x 0.03m) with frosted diffuser (transparent, emissive)
- SpotLight pointing downward with wide angle, soft penumbra

### 5.3 LED Spot
- Flat cylinder (radius ~0.04m, height ~0.015m) — puck-style
- SpotLight pointing down, narrow cone

**Files:**
- `src/store/types.ts` — add `'light-fixture'` to `DeviceKind`; add `fixtureModel?: 'led-bulb' | 'led-bar' | 'led-spot'` to `DeviceMarker`
- `src/components/devices/DeviceMarkers3D.tsx` — new `LightFixtureMarker` component with 3 sub-renderers; add to `markerComponents`
- `src/components/build/devices/DevicePlacementTools.tsx` — add `'place-light-fixture'` entries under "Ljus" category (3 entries: LED Lampa, LED Bar, LED Spot)
- `src/components/build/BuildInspector.tsx` — handle `light-fixture` in DeviceInspector, show fixture model selector
- `src/lib/haDomainMapping.ts` — map `light-fixture` to `['light']` domain
- `src/lib/haMapping.ts` — `light-fixture` uses same LightState mapping as `light`

## Task 6: Multi-entity HA support

**Problem:** A single device can only link to one HA entity. Users need to link multiple lights to one HA entity (e.g., a button controlling several fixtures).

**Fix:** Extend `DeviceMarker.ha` to support multiple entity IDs. Show a warning badge when multiple devices share the same entity.

**Files:**
- `src/store/types.ts` — keep `ha?: { entityId: string }` as-is (each device still has one entity), but the UI will warn when multiple markers reference the same entity
- `src/components/build/BuildInspector.tsx` — in DeviceInspector HA section, check if other markers share the same `entityId`; if so, show an info badge: "⚠ N enheter delar denna entitet"
- `src/components/build/devices/HAEntityPicker.tsx` — show a small count badge next to entities that are already linked to other devices

## Task 7: New device category "Kontakter" + wall outlet

### 7.1 New category in DevicePlacementTools
Add "Kontakter" category with a "Vägguttag" (smart wall outlet) entry.

### 7.2 Wall Outlet 3D model
Procedural 3D model: small box (0.05m x 0.08m x 0.03m) with a circular recess, plus a small LED sphere (green = on, dark = off). Wall-mountable by default.

**Files:**
- `src/store/types.ts` — add `'smart-outlet'` to `DeviceKind`
- `src/components/build/devices/DevicePlacementTools.tsx` — add "Kontakter" category with entry `{ key: 'place-smart-outlet', kind: 'smart-outlet', label: 'Vägguttag', icon: Plug, color: 'text-green-400', category: 'Kontakter' }`; add to `categoryOrder`
- `src/components/devices/DeviceMarkers3D.tsx` — new `SmartOutletMarker` (box body + LED indicator + green glow when on); add to `markerComponents`
- `src/components/build/BuildInspector.tsx` — add `'smart-outlet'` to `kindLabels`
- `src/lib/haDomainMapping.ts` — map `smart-outlet` to `['switch']`; reverse map `switch` could also be `smart-outlet`
- `src/lib/haMapping.ts` — `smart-outlet` uses `GenericDeviceState` (on/off)

## Task 8: Version bump to 1.3.0

**Files:** `package.json`, `bjorq_dashboard/config.yaml`, `README.md`, `bjorq_dashboard/README.md`, `CHANGELOG.md`

---

## Summary of file changes

| File | Changes |
|------|---------|
| `src/store/types.ts` | Add `'devices'`, `'place-light-fixture'`, `'place-smart-outlet'` to BuildTool; add `'light-fixture'`, `'smart-outlet'` to DeviceKind; extend LightType; add `fixtureModel` to DeviceMarker |
| `src/components/build/BuildModeV2.tsx` | Change Enheter tool from `place-light` to `devices` |
| `src/components/build/BuildScene3D.tsx` | Exclude `'devices'` tool from placement logic; clamp prop Y |
| `src/components/build/devices/DevicePlacementTools.tsx` | Empty default categories; add Kontakter + Ljusarmatur entries |
| `src/components/devices/DeviceMarkers3D.tsx` | Add LightFixtureMarker, SmartOutletMarker, ceiling-small, lightbar renderers |
| `src/components/build/BuildInspector.tsx` | Add new light types, fixture model selector, multi-entity warning, new kindLabels |
| `src/components/build/devices/HAEntityPicker.tsx` | Show shared-entity count badge |
| `src/lib/wallGeometry.tsx` | Fix corner threshold, tighten miter clamping |
| `src/lib/haDomainMapping.ts` | Add light-fixture, smart-outlet mappings |
| `src/lib/haMapping.ts` | Add light-fixture, smart-outlet cases |
| `CHANGELOG.md`, `README.md`, `package.json`, `bjorq_dashboard/*` | Version 1.3.0 |

