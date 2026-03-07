

# Fix: Invisible ceiling blocking view from outside

## Root Cause
`Ceilings3D.tsx` renders ceiling meshes with `colorWrite={false}` and `side: THREE.DoubleSide`. This creates an invisible surface that still writes to the **depth buffer**. When you look at the room from outside/above, the ceiling occludes everything behind it — walls, furniture, devices — because the depth test prevents those pixels from rendering. From inside the room, you're on the correct side of the depth surface so everything appears fine.

## Fix
**Remove Ceilings3D entirely** from both `BuildScene3D.tsx` and `Scene3D.tsx`. The component serves no useful visual purpose (it's invisible) and actively breaks visibility. If ceilings are needed later, they should be implemented as a proper visible or toggleable surface — not a depth-only occluder.

### Files to change:
1. **`src/components/build/BuildScene3D.tsx`** — Remove `<Ceilings3D />` from the scene
2. **`src/components/Scene3D.tsx`** — Remove `<Ceilings3D />` import and usage if present

