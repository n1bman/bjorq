

## Plan: Fix Prop Loading, Add Name/Rename + Performance Info in Inspector

### Problem 1: Furniture models fail to load ("Failed to fetch")
Lovable's CDN proxy intercepts `window.fetch`, which breaks `GLTFLoader.load()` on `blob:` URLs. The house model works because `ImportedHome3D.tsx` validates the blob first and falls back to base64 reconstruction. Props have no such fallback.

**Fix: `src/components/build/Props3D.tsx`**
- For `blob:` and `data:` URLs: fetch the blob as ArrayBuffer using native `XMLHttpRequest` (bypasses CDN proxy), then call `loader.parse(arrayBuffer, '')` instead of `loader.load(url)`
- For regular URLs: keep using `loader.load()` as before
- This is the same pattern used by ImportedHome3D's blob validation

### Problem 2: No model info or rename capability in inspector
The `PropInspector` in `BuildInspector.tsx` shows the raw URL and a UUID as identifier. No performance stats, no editable name, no HA entity field.

**Fix: `src/components/build/BuildInspector.tsx` — PropInspector**
- Show catalog name (from `catalog.find(c => c.id === prop.catalogId)`) as editable text input at the top
- When renamed, update the catalog item name via a new `updateCatalogItem` action (or reuse `addToCatalog` with same id)
- Display model performance stats (triangles, meshes, materials, rating) below the name — sourced from a new `modelStats` field on PropItem, populated by Props3D after loading
- Add a placeholder section "HA Entity (kommande)" as a disabled field to signal future HA linking

**Fix: `src/store/types.ts`**
- Add optional `name?: string` to `PropItem` for per-instance override name
- Add optional `modelStats?: { triangles: number; meshCount: number; materialCount: number; rating: string }` to `PropItem`
- Add optional `haEntityId?: string` to `PropItem` for future HA linking

**Fix: `src/store/useAppStore.ts`**
- Add `updateCatalogItem` action to update a catalog item's name/category
- In `updateProp`, ensure `modelStats` can be persisted

**Fix: `src/components/build/Props3D.tsx`**
- After successful model load and analysis, call `updateProp(id, { modelStats: info })` to persist stats to the store so the inspector can read them

### Files modified (4)
- `src/components/build/Props3D.tsx` — XHR-based blob loading + persist modelStats
- `src/components/build/BuildInspector.tsx` — editable name, performance stats display, HA entity placeholder
- `src/store/types.ts` — add `modelStats`, `name`, `haEntityId` to PropItem
- `src/store/useAppStore.ts` — add `updateCatalogItem` action

