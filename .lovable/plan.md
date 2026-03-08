

# Lighting Correction and Performance Optimization Pass

## Analysis

### Why indoor light feels incomplete
The scene has only **one** indoor bounce light: a single `pointLight` at `[0, 3, 0]` controlled by `indoorBounce`. This is a single point in the center of the entire house — it does not adapt to room positions or window locations. Rooms far from center or on one side get almost no fill. There is no hemisphere light to simulate sky/ground bounce. The ambient light (`ambientLight`) is low (0.35) and cool-toned (`#b8c4d4`), providing minimal warm fill.

### What is costing FPS
1. **`<Environment preset="night" />`** — generates a cube map and applies IBL. Expensive, and "night" preset adds little visible value during daytime. This is **on by default**.
2. **Every opening detail mesh casts shadows** — door frames, handles, sills, garage sections all have `castShadow`. A single door = 5-6 shadow casters. A house with 10 openings = 50+ extra shadow casters for tiny geometry.
3. **Per-opening inline materials** — each frame/panel/handle creates a new `MeshStandardMaterial` instance inline. No sharing across identical colors.
4. **Corner blocks** — each corner creates its own material instance.
5. **Shadow map at 2048** on high quality — combined with many casters, this is heavy.
6. **Blue accent pointLight** at `[0, 8, 0]` — cosmetic, adds a draw call and light computation for minimal visual benefit.

### Wall optimization opportunities
- Opening detail meshes (frames, handles, sills) don't need `castShadow` — they are too small to produce meaningful shadows
- Corner block materials can be shared via a cached map
- Inline `new MeshStandardMaterial(...)` in JSX creates new instances every render — should be memoized

## Plan

### Phase 1: Indoor Light Correction (cheap)

**`src/components/Scene3D.tsx`**
- Replace the single center `pointLight` bounce with a **`hemisphereLight`** (sky=#fff5e0, ground=#3a5a2a, intensity=0.4 * indoorBounce). This gives uniform warm fill from above + ground color bounce — zero shadow cost, single light.
- Remove the blue accent `pointLight` at `[0,8,0]` — it adds cost for negligible visual value.
- Increase ambient intensity slightly during daytime: 0.35 → 0.45. This softens interior darkness without adding lights.

### Phase 2: Performance Recovery

**`src/components/Scene3D.tsx`**
- Default `environmentLight` to **false** in store. The `<Environment preset="night"/>` IBL is expensive and barely visible. Users can re-enable it.
- Remove the blue accent pointLight entirely.

**`src/components/build/Walls3D.tsx`**
- Remove `castShadow` from ALL opening detail meshes: door frames, door panels, handles, window frames, window sills, garage door sections, garage frames, passage frames. Only wall body segments and corner blocks should cast shadows.
- Memoize shared materials for opening details (frame color, door color) to reduce material instance count.

**`src/store/useAppStore.ts`**
- Change default `environmentLight: true` → `environmentLight: false`.

### Phase 3: Optional Polish

**`src/lib/wallMaterials.ts`**
- No changes needed — already clean.

**`src/components/build/Ceilings3D.tsx`**
- No changes needed — already minimal (BackSide, no colorWrite).

## Expected Impact

| Change | FPS recovery | Visual impact |
|--------|-------------|---------------|
| Remove Environment IBL default | +10-15 FPS | Minimal — scene already lit by directional + ambient |
| Remove castShadow from ~50 opening meshes | +5-10 FPS | None — these shadows are sub-pixel |
| Remove blue accent light | +2-3 FPS | None |
| Add hemisphereLight for bounce | -1 FPS | Significant — warm indoor fill |
| Increase ambient | 0 | Softer interiors |

Net estimated recovery: **~15-25 FPS** while improving indoor lighting quality.

## Files

| File | Change |
|------|--------|
| `src/components/Scene3D.tsx` | Add hemisphereLight, remove blue pointLight, increase ambient, keep Environment off by default |
| `src/components/build/Walls3D.tsx` | Remove castShadow from all opening detail meshes |
| `src/store/useAppStore.ts` | Default environmentLight to false |

