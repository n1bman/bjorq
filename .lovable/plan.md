

## Plan: Shadow System Fix + Imported Model Transparency + Performance Toggle

### Problems Identified

1. **Imported house model and props don't cast/receive shadows** — `ImportedHome3D.tsx` and `Props3D.tsx` never set `castShadow`/`receiveShadow` on meshes
2. **BuildScene3D ignores performance settings** — shadows are always on regardless of the Prestanda toggle
3. **No option to make imported models semi-transparent** for sunlight penetration
4. **Performance shadow toggle has no effect in Build mode**

### Changes

#### 1. `src/components/build/ImportedHome3D.tsx` — Enable shadows on imported model meshes
- After loading the GLTF scene, `traverse` all meshes and set `castShadow = true` and `receiveShadow = true`
- Read `performance.shadows` from store; only enable when shadows are on
- Add optional transparency: read a new `importedOpacity` field from `homeGeometry.imported` (default 1.0). When < 1, set material transparent + opacity on all meshes, allowing sunlight through

#### 2. `src/components/build/Props3D.tsx` — Enable shadows on props
- In `PropModel`, traverse the cloned GLTF scene and set `castShadow = true` and `receiveShadow = true` on all meshes

#### 3. `src/components/build/BuildScene3D.tsx` — Respect performance settings
- Read `performance.shadows` and `performance.quality` from store
- Pass `shadows={perf.shadows}` to `<Canvas>`
- Conditionally set `castShadow={perf.shadows}` on the directional light
- Adjust shadow map size based on quality level (same as Scene3D)

#### 4. `src/store/types.ts` — Add `importedOpacity` to imported geometry config
- Add `importedOpacity?: number` to the imported model config (0.0–1.0, default 1.0)

#### 5. `src/components/build/BuildInspector.tsx` — Add opacity slider for imported model
- In the import inspector section, add a slider "Solljus-transparens" (0–100%) that controls `importedOpacity`
- This lets users choose whether sunlight passes through the 3D model walls

#### 6. `src/components/Scene3D.tsx` — Also apply shadow flags to directional light conditionally
- Already partially done, but ensure `castShadow={enableShadows}` is properly gated

### Technical Notes
- GLB model shadow traversal uses `scene.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } })`
- Transparency for sunlight: setting material opacity to ~0.2 on imported model meshes lets the directional light's shadow map "see through" the walls partially. For true light penetration, we set `material.transparent = true` and reduce opacity
- Shadow map: Three.js shadow maps are binary (shadow or no shadow), so transparency won't create partial shadows. Instead, when opacity < 1 we can optionally set `castShadow = false` on the imported model so it doesn't block the sun at all — giving the effect of sunlight coming through

### Files Modified
- `src/store/types.ts` — add `importedOpacity`
- `src/components/build/ImportedHome3D.tsx` — shadow traversal + opacity
- `src/components/build/Props3D.tsx` — shadow traversal
- `src/components/build/BuildScene3D.tsx` — respect perf settings
- `src/components/build/BuildInspector.tsx` — opacity slider for imported model
- `docs/roadmap-vNext.md` — update

