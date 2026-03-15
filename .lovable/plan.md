

# Plan: Egg device, A/D fix, FOV adjustment

## 1. New "Egg" device kind

Add `'egg'` to `DeviceKind` union type and register it in all device systems. This replaces `vacuum` as the Roberto spawn trigger so the vacuum keeps its normal docking-station behavior.

**Files:**
- `src/store/types.ts` — add `'egg'` to `DeviceKind` union
- `src/components/build/devices/DevicePlacementTools.tsx` — add entry in `deviceTools` array under Robot category: `{ key: 'place-egg', kind: 'egg', label: 'Egg', icon: Egg (lucide), category: 'Robot' }` and in `kindLabels`
- `src/components/devices/DeviceMarkers3D.tsx` — add `egg` to `markerComponents` record (use a distinct color like gold `#d4a017`)
- `src/components/devices/DevicesOverlay.tsx` — add `egg` to the `deviceKinds` list
- `src/lib/fpsSpawn.ts` — change spawn lookup from `m.kind === 'vacuum'` to `m.kind === 'egg'`
- `src/lib/haDomainMapping.ts` — add egg mapping if needed (no HA domain, just a placeholder)
- `docs/easter-egg-roberto.md` — update activation instructions

Also need to add `'place-egg'` to `BuildTool` union in types.ts.

## 2. Fix A/D swap

The right vector is currently `(forward.z, 0, -forward.x)` which is actually LEFT. Fix to `(-forward.z, 0, forward.x)`.

**File:** `src/components/home/FPSController.tsx` line 138
```
// Before:
const right = new THREE.Vector3(forward.z, 0, -forward.x);
// After:
const right = new THREE.Vector3(-forward.z, 0, forward.x);
```

## 3. FOV adjustment

Default Three.js FOV is 75°. FPS games typically use 90-100° for a natural "being there" feeling. Set camera FOV to 90° on FPS mount, restore original on unmount.

**File:** `src/components/home/FPSController.tsx` — in the mount `useEffect`, save `camera.fov`, set `camera.fov = 90`, call `camera.updateProjectionMatrix()`. Restore on unmount.

