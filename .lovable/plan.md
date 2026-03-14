

# Fix: Light Fixtures Default to "On" in Design Mode

## Problem
Light fixtures (`led-bulb`, `led-bar`, `led-spot`) show no light because when no HA entity is connected, `isOn = false` and `intensity = 0`. The mesh bodies render but are dark and lifeless.

## Fix
In `LightFixtureMarker`, when no HA state exists (`state === undefined`), default to **on** with a warm preview color and moderate brightness. This gives immediate visual feedback in design mode. When an HA entity is linked, it uses real state as before.

Apply the same fix to `LightMarker` (the original light types) for consistency — they have the same issue.

**File:** `src/components/devices/DeviceMarkers3D.tsx`

### Changes
1. **LightMarker** (line ~39): Change `isOn` logic to default to `true` when no state exists:
   ```ts
   const hasState = state?.kind === 'light';
   const lightData = hasState ? state.data : null;
   const isOn = hasState ? (lightData?.on ?? false) : true; // preview on
   ```
   Update lightColor to return warm default when `!hasState && isOn`.

2. **LightFixtureMarker** (line ~1188): Same pattern:
   ```ts
   const hasState = state?.kind === 'light';
   const lightData = hasState ? state.data : null;
   const isOn = hasState ? (lightData?.on ?? false) : true;
   ```
   Update lightColor: when `!lightData && isOn` return warm `#f5c542` instead of `#555555`.

3. **Intensity scaling** — review that fixture light distances/intensities are proportional to their physical size:
   - `led-bulb`: pointLight intensity `brightness * 2`, distance `3` (small room lamp)
   - `led-bar`: spotLight intensity `brightness * 4`, distance `5`, wide angle (linear downlight)
   - `led-spot`: spotLight intensity `brightness * 5`, distance `4`, narrow cone (focused beam)

