

# Bring back Ceilings3D as shadow-only

## Problem
The ceiling was removed because `colorWrite: false` + `depthWrite: true` (default) caused it to occlude everything behind it visually. But the user wants it back to block sunlight.

## Solution
Keep `colorWrite: false` but add `depthWrite: false`. This makes the mesh completely invisible to the color and depth passes. However, `castShadow: true` still works because Three.js shadow maps use their own depth material — independent of the main material's settings. The ceiling will block directional light (creating indoor shadows) without hiding anything visually.

### Changes

1. **`src/components/build/Ceilings3D.tsx`** — Update the mesh material:
   - Add `depthWrite={false}` to prevent depth occlusion
   - Keep `colorWrite={false}` so it's invisible
   - Add `castShadow` to the mesh so it blocks sunlight

2. **`src/components/build/BuildScene3D.tsx`** — Re-add `<Ceilings3D />`

3. **`src/components/Scene3D.tsx`** — Re-add `<Ceilings3D />`

