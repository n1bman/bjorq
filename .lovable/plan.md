

# Phase 1 — Model Cache + Texture Cache Implementation

## Scope

This is **Phase 1 only** — the model cache, texture cache, and Props3D integration. No persistent Canvas changes yet.

## Current State Summary

- `Props3D.tsx` (635 lines): Each `PropModel` independently loads GLB via `doLoad()`, stores scene in local `useState`, and disposes everything on unmount via `disposeScene()` which aggressively destroys geometry/materials/textures
- Cache key candidates: `catalogId` (from `getFileDataForProp`) for catalog items, `propId` for unique uploads
- `displayScene` useMemo (line 368-403) clones the entire scene and clones every material on each dependency change — including `isSelected`/`isHovered` which don't actually need material changes anymore (emissive was removed)
- `new THREE.TextureLoader().load(textureOverride)` is called inside useMemo (line 390) — re-fires on every clone cycle
- Module-level `sceneRefs` Map already exists (line 17) for placement engine — will be replaced by cache refs
- `Scene3D.tsx` and `BuildScene3D.tsx` both mount their own `<Canvas>` — each mode switch destroys all GPU resources

## New Files

### `src/lib/modelCache.ts`

```text
interface CacheEntry {
  scene: THREE.Group          // "golden" parsed original — never modified
  refCount: number
  stats: PropModelStats
  lastUsed: number
  triangles: number
}

interface TextureCacheEntry {
  texture: THREE.Texture
  refCount: number
  lastUsed: number
}

// Model cache
acquire(cacheKey: string, loader: () => Promise<THREE.Group>): Promise<THREE.Group>
  → if cached: refCount++, return scene.clone()
  → if not: await loader(), store golden, refCount=1, return clone

release(cacheKey: string): void
  → refCount--; if 0: dispose golden scene, remove from map

// Texture cache
acquireTexture(url: string): THREE.Texture
  → if cached: refCount++, return same texture ref
  → if not: load, store, return

releaseTexture(url: string): void
  → refCount--; if 0: dispose, remove

// Stats & safety
getStats(): { modelCount, totalTriangles, textureCount }
evictLRU(): void  // called when totalTriangles > 2M or entries > 50

// For placement engine (replaces sceneRefs)
getGoldenScene(cacheKey: string): THREE.Group | undefined
```

Key rules:
- Golden scenes are NEVER modified — all customization happens on clones
- `scene.clone()` shares geometry buffer references (memory efficient)
- Material cloning happens in Props3D display logic, not in cache
- Disposal only through cache eviction, never by individual prop components

### Cache key strategy

```text
catalogId exists → key = `catalog:${catalogId}`     (shared across identical props)
no catalogId    → key = `upload:${propId}`           (unique per user upload)
```

## Changes to `Props3D.tsx`

1. **Remove** `disposeScene()` function — unsafe with shared cache
2. **Remove** module-level `sceneRefs` Map — replaced by `modelCache.getGoldenScene()`
3. **Replace** `doLoad()` with `modelCache.acquire(cacheKey, loaderFn)`
4. **Replace** unmount cleanup with `modelCache.release(cacheKey)`
5. **Fix `displayScene` useMemo dependencies**: Remove `isSelected` and `isHovered` from deps (they no longer affect materials)
6. **Replace** inline `new THREE.TextureLoader().load(textureOverride)` with `modelCache.acquireTexture(textureOverride)` and release on change/unmount
7. **`selectionBox` useMemo** (line 406-426): Currently clones scene AGAIN just for bbox, then disposes. Replace with `THREE.Box3().setFromObject(scene)` on the golden scene ref (read-only, no clone needed)

### PropModel lifecycle change

```text
Before:
  mount → doLoad() → parse GLB → useState(scene) → displayScene clones
  unmount → disposeScene() destroys everything

After:
  mount → modelCache.acquire(key, loader) → useState(goldenClone)
  unmount → modelCache.release(key) — cache decides if real disposal needed
  texture change → releaseTexture(old), acquireTexture(new)
```

## Changes to `placementEngine.ts`

- Import `getGoldenScene` from modelCache instead of `sceneRefs` from Props3D
- Update lookups: `sceneRefs.get(propId)` → `getGoldenScene(cacheKey)`
- Need to pass cacheKey or maintain a propId→cacheKey mapping

## Files Changed

| File | Change |
|------|--------|
| `src/lib/modelCache.ts` | **New** — cache singleton |
| `src/components/build/Props3D.tsx` | Major refactor — use cache, fix displayScene deps, texture cache |
| `src/lib/placementEngine.ts` | Update scene ref lookups |

## What This Does NOT Change

- No persistent Canvas yet (Phase 2/3)
- No changes to Scene3D or BuildScene3D structure
- No loading screen yet (Phase 4)
- No version bump — stability validation first

## Expected Impact

- Same catalog model used by N props: parsed once instead of N times
- Mode switch still destroys Canvas, but model re-parse on return is instant (cache hit)
- Texture overrides shared across identical URLs
- Memory bounded by LRU eviction at 2M triangles / 50 entries
- `displayScene` reclones less often (removed stale deps)

