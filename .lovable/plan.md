

# Easter Egg: FPS Walk Mode ("Roberto Mode")

## File breakdown

### New files (4)
| File | Purpose |
|------|---------|
| `src/lib/fpsCollision.ts` | Wall collision detection (circle vs thick line segments, opening pass-through) |
| `src/lib/fpsSpawn.ts` | Find Roberto marker, validate spawn position, nudge away from walls |
| `src/components/home/FPSController.tsx` | R3F component: WASD movement, pointer lock mouse look, useFrame loop, collision integration |
| `docs/easter-egg-roberto.md` | Full documentation: activation, collision, removal instructions |

### Existing files touched (2, minimal changes)
| File | Change |
|------|--------|
| `src/components/PersistentScene3D.tsx` | ~20 lines: local `fpsMode` state, `O`/`P`/`Escape` key listener (home mode only), conditionally render `<FPSController>`, pass `fpsActive` to `CameraController` to disable OrbitControls |
| `src/components/home/HomeView.tsx` | ~5 lines: accept `fpsActive` prop, hide widgets/nav overlay when FPS is active |

## Activation / deactivation

1. User presses `O` in Home view → `findRobertoSpawn()` searches `devices.markers` for `name.toLowerCase().includes('roberto')` with `kind === 'vacuum'`
2. If not found → toast "Placera en robot med namnet 'Roberto' för att aktivera FPS-läge", abort
3. If found → save current camera position/target, set `fpsMode = true`
4. `FPSController` mounts, requests pointer lock (desktop only — check `window.matchMedia('(pointer: fine)')`)
5. Press `P` or `Escape` → release pointer lock, restore saved camera state, set `fpsMode = false`
6. Guard: skip if `document.activeElement` is input/textarea

## Spawn validation (`fpsSpawn.ts`)

1. Get Roberto's `position[0], position[2]` as XZ spawn
2. Get floor elevation from Roberto's `floorId` → Y = `elevation + 1.80`
3. Run collision check against all walls on that floor with radius 0.3m
4. If spawn is inside a wall, iteratively nudge position outward (try 8 directions at 0.5m increments, up to 2m) until clear
5. Return validated `{ position, floorId, elevation }` or `null` if completely stuck

## Collision system (`fpsCollision.ts`)

```text
Wall segment: A────[door gap]────B
              ████              ████  ← solid portions (thickness)
Player ● (r=0.25m) blocked by solid, passes through door gap
```

1. For each wall on the active floor, compute solid sub-segments by excluding openings
2. Each solid sub-segment is a thick line (capsule on XZ): `from`→`to` with `thickness/2 + playerRadius`
3. For a candidate position, compute distance to each solid sub-segment
4. If distance < threshold, project movement onto wall tangent (slide along wall)
5. Opening pass-through: compute opening's world-space position along wall using `offset * wallLength` and `width`, skip collision for that segment portion
6. Types `door`, `passage`, `garage-door` all allow pass-through

## FPSController.tsx

- `useFrame` loop: read WASD keys from a `Set<string>`, compute forward/strafe vectors from camera yaw
- Movement speed: 3 m/s, multiply by delta
- Mouse: `pointermove` event during pointer lock → adjust yaw (unlimited) and pitch (clamped ±85°)
- Apply collision check before updating `camera.position`
- Camera Y locked to `floorElevation + 1.80`
- On mount: save camera state, request pointer lock
- On unmount: restore camera state, release pointer lock
- Pointer lock only requested if `matchMedia('(pointer: fine)')` matches (desktop)

## PersistentScene3D changes

In `CameraController`:
```
if (appMode === 'home' && fpsActive) return <FPSController ... />;
if (appMode === 'standby') return <StandbyStaticCamera />;
...
```

Key listener added in `PersistentScene3D` (the outer component), gated by `appMode === 'home'`.

## How to remove later

1. Delete 3 new files: `FPSController.tsx`, `fpsCollision.ts`, `fpsSpawn.ts`, `easter-egg-roberto.md`
2. In `PersistentScene3D.tsx`: remove `fpsMode` state, key listener, and the FPS branch in `CameraController`
3. In `HomeView.tsx`: remove `fpsActive` prop and conditional hiding
4. No store changes, no type changes, no persistence — zero cleanup needed

