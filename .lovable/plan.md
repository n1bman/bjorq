

## Plan: Fix Props3D Loader + Hidden Device Markers Still Clickable

### Problem 1: Props/furniture loading unreliably
`Props3D.tsx` still uses `useLoader(GLTFLoader, url)` which suspends and can fail silently. The robust manual loader with state machine, timeout, retry, and disposal was only applied to `ImportedHome3D.tsx`.

**Fix: `src/components/build/Props3D.tsx`**
- Replace `useLoader(GLTFLoader, url)` with a manual `GLTFLoader.load()` call
- Add state machine: `idle | loading | ready | error`
- Add 30s timeout + one automatic retry with cache-busted URL
- Proper disposal of old scene before loading new one
- Show error fallback (orange wireframe box + retry) on failure
- Show loading fallback (wireframe box) while loading

### Problem 2: Hidden device markers should remain clickable
When `showDeviceMarkers` is false, only `LightMarkerLightOnly` is rendered (lights only, no mesh). All other device types return `null`. Users want to still click invisible markers to toggle devices.

**Fix: `src/components/devices/DeviceMarkers3D.tsx`**
- When `hideVisuals` is true, instead of returning `null` for non-light markers and using `LightMarkerLightOnly` for lights:
  - For **lights**: keep `LightMarkerLightOnly` but add an invisible click sphere (material with `opacity: 0`, but still in the scene graph for raycasting)
  - For **all other marker types**: render an invisible click sphere at the marker position (transparent material, `visible` must stay `true` — use `opacity: 0` with `transparent: true` but keep the mesh in the scene graph)
- The invisible spheres get `onClick` handlers that call `handleSelect` which triggers `toggleDeviceState` in home mode
- Key insight: R3F raycasting ignores objects with `visible=false`, so we must use `opacity: 0` instead

**Changes in `LightMarkerLightOnly`:**
- Add an invisible sphere mesh with `onClick` handler for toggling

**Changes in the `hideVisuals` block (line ~1254):**
- Instead of returning `null` for non-light markers, render an `InvisibleClickTarget` component that has an invisible sphere + the same `onSelect` handler

### Files modified (2)
- `src/components/build/Props3D.tsx` — robust manual loader
- `src/components/devices/DeviceMarkers3D.tsx` — invisible click targets when markers hidden

