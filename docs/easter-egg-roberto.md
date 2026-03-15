# Easter Egg: Roberto Mode (FPS Walk)

## Overview

Roberto Mode is an isolated FPS walk mode Easter egg that lets users walk around inside their home in first-person perspective.

## Activation

1. Place a **Robot/Vacuum** device in Build mode under **Devices > Robot**
2. Name the device **"Roberto"** (case-insensitive)
3. In **Home view**, press **`O`** to activate FPS mode
4. The camera spawns at Roberto's position at 1.80m eye height

## Controls

| Key | Action |
|-----|--------|
| `W` | Move forward |
| `A` | Strafe left |
| `S` | Move backward |
| `D` | Strafe right |
| Mouse | Look around (pointer lock) |
| `P` or `Escape` | Exit Roberto mode |
| Click canvas | Re-acquire pointer lock if lost |

## Deactivation

- Press `P` or `Escape` to exit
- Camera and OrbitControls are restored to their previous state
- All Home view widgets reappear

## Collision System

- Player is a circle (r=0.25m) on the XZ plane
- Walls are thick line segments (collision = wall thickness/2 + player radius)
- Openings of type `door`, `passage`, `garage-door` allow pass-through
- Solid wall sections block movement with slide-along behavior
- No physics engine — lightweight per-frame collision resolution

## Spawn Validation

- Roberto's position is checked against walls on spawn
- If inside a wall, the spawn is nudged outward (8 directions, up to 2m)
- If completely stuck, FPS mode won't activate

## Desktop Only (v1)

- Pointer lock only requested on devices with `(pointer: fine)` media query
- Touch/tablet devices: Roberto mode is unavailable in v1

## Files Added

| File | Purpose |
|------|---------|
| `src/components/home/FPSController.tsx` | R3F camera controller: WASD, mouse look, collision |
| `src/lib/fpsCollision.ts` | Wall collision detection with opening pass-through |
| `src/lib/fpsSpawn.ts` | Roberto marker lookup and spawn validation |
| `docs/easter-egg-roberto.md` | This documentation |

## Files Modified

| File | Change |
|------|--------|
| `src/components/PersistentScene3D.tsx` | ~25 lines: `fpsMode` state, key listener, conditional FPS controller render |
| `src/components/home/HomeView.tsx` | ~3 lines: hide overlays during FPS mode via `fpsActive` prop |

## How to Remove

1. Delete these files:
   - `src/components/home/FPSController.tsx`
   - `src/lib/fpsCollision.ts`
   - `src/lib/fpsSpawn.ts`
   - `docs/easter-egg-roberto.md`

2. In `src/components/PersistentScene3D.tsx`:
   - Remove `fpsMode` / `fpsSpawnData` state variables
   - Remove the `useEffect` key listener for `O`/`P`/`Escape`
   - Remove the FPS branch in `CameraController`
   - Remove the `FPSController` import
   - Remove `fpsActive` prop passing

3. In `src/components/home/HomeView.tsx`:
   - Remove the `fpsActive` prop
   - Remove the conditional hiding of widgets/nav

4. No store, type, or persistence changes to revert.

## Known Limitations (v1)

- No floor switching — FPS stays on the floor where Roberto is placed
- No stair traversal
- No touch/tablet support
- No crosshair or HUD overlay
- Pointer lock may be blocked by some browsers on first attempt (click canvas to retry)
- Movement speed is fixed at ~3 m/s
