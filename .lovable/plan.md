

## Plan: Shadow Fix, Full Rotation, Black Text Fix, Robust 3D Loader

### 1. Remove shadow casting from imported house model

**File: `src/components/build/ImportedHome3D.tsx`**
- Change `child.castShadow = shouldCast` to `child.castShadow = false` — imported house never casts shadows
- Keep `child.receiveShadow = shadowsEnabled` so the house still receives shadows from lights and sun
- Props in `Props3D.tsx` keep casting shadows (already working correctly)

### 2. Full XYZ rotation for imported 3D model

**File: `src/components/build/import/ImportTools.tsx`**
- Replace single Y-axis rotation slider with three sliders (X, Y, Z), each ranging -180° to 180°
- The values are currently stored in radians in `imported.rotation`

**File: `src/components/build/ImportedHome3D.tsx`**
- Fix the double-conversion bug: the rotation values are stored in radians (ImportTools uses `degToRad`), but `ImportedHome3D` line 114 converts from degrees again. Remove the `* Math.PI / 180` conversion since values are already in radians

### 3. Fix black text on dark backgrounds

**File: `src/components/ui/input.tsx`**
- Add explicit `text-foreground` class to the Input component so number inputs and text inputs always use the theme foreground color

**File: `src/components/ModeHeader.tsx`**
- Add `text-foreground` to the "Bygge" heading to ensure it's not inheriting a wrong color

### 4. Robust 3D model loader with state machine and WebGL context recovery

**File: `src/components/build/ImportedHome3D.tsx`** — Major refactor:

- **Loader state machine**: Replace `useLoader` (which suspends) with manual `GLTFLoader.load()` call. Track `modelStatus: 'idle' | 'loading' | 'ready' | 'error'`
- **Timeout + retry**: 30-second timeout, one automatic retry with cache-busting (`?v=Date.now()`)
- **Error UI**: Show "Reload 3D model" button (using `Html` from `@react-three/drei`) when status is `error`
- **Proper disposal**: Before loading a new model, traverse old scene and call `geometry.dispose()`, `material.dispose()`, dispose textures

**File: `src/components/Scene3D.tsx`** and **`src/components/build/BuildScene3D.tsx`**:
- Add WebGL context loss/restore handlers on the Canvas `gl` element:
  - `webglcontextlost`: preventDefault, show banner
  - `webglcontextrestored`: force re-render / reload model

### 5. Update roadmap

**File: `docs/roadmap-vNext.md`** — Mark these fixes as completed under Phase 7 refinements

### Files modified (6)
- `src/components/build/ImportedHome3D.tsx` — remove castShadow, fix rotation bug, robust loader
- `src/components/build/import/ImportTools.tsx` — XYZ rotation sliders
- `src/components/ui/input.tsx` — add `text-foreground`
- `src/components/ModeHeader.tsx` — explicit text color
- `src/components/Scene3D.tsx` — WebGL context loss handling
- `src/components/build/BuildScene3D.tsx` — WebGL context loss handling
- `docs/roadmap-vNext.md` — update

