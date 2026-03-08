

# Asset Catalog + Model Import/Optimization System

## Current State

The project already has:
- **PropCatalogItem** type: `{ id, name, url, source, thumbnail?, category? }` — minimal metadata
- **PropItem** type: placed instances with position/rotation/scale/HA entity/material overrides
- **FurnishTools.tsx**: file picker UI with basic import, category assignment, search
- **server/api/assets.js**: server-side asset storage with type/variant folders
- **Props3D.tsx**: 3D rendering with base64 loading, error states, drag placement
- **server storage**: `data/projects/{id}/assets/{type}/{assetId}/` structure

What's missing: rich metadata, subcategories, thumbnails, optimization pipeline, curated catalog support, visual catalog UI.

---

## Architecture

### 1. Catalog Folder Structure (repo-level curated assets)

```text
public/catalog/
  index.json                    ← master manifest (auto-generated or maintained)
  furniture/
    sofas/
      modern-sofa/
        model.glb
        thumb.webp
        meta.json
    chairs/
      dining-chair/
        model.glb
        thumb.webp
        meta.json
    tables/
    beds/
    storage/
    lighting/
    decor/
    plants/
  devices/
    lights/
    speakers/
    screens/
    sensors/
```

User-imported assets stored in project state (existing `PropCatalogItem` + `fileData` in localStorage/server).

`index.json` is a flat array of all curated asset entries — the app reads this single file to populate the catalog without scanning folders.

### 2. Metadata Schema — `CatalogAssetMeta`

```typescript
interface CatalogAssetMeta {
  id: string;                          // unique, e.g. "modern-sofa-01"
  name: string;                        // display name
  category: AssetCategory;             // top-level
  subcategory?: string;                // e.g. "sofas", "dining-chairs"
  style?: string;                      // e.g. "modern", "scandinavian", "industrial"
  tags?: string[];                     // free-form search tags
  model: string;                       // relative path to GLB
  thumbnail?: string;                  // relative path to thumb.webp
  dimensions?: {                       // bounding box in meters
    width: number;
    depth: number;
    height: number;
  };
  placement: 'floor' | 'wall' | 'ceiling' | 'table'; // default placement
  defaultRotation?: [number, number, number];          // radians
  shadow?: { cast: boolean; receive: boolean };
  ha?: {                               // HA mapping support
    mappable: boolean;
    defaultDomain?: string;            // e.g. "light", "media_player"
    defaultKind?: DeviceKind;
  };
  performance?: {                      // pre-computed stats
    triangles: number;
    materials: number;
    fileSizeKB: number;
  };
  source: 'curated' | 'user';
}

type AssetCategory =
  | 'sofas' | 'chairs' | 'tables' | 'beds' | 'storage'
  | 'lighting' | 'decor' | 'plants' | 'kitchen' | 'bathroom'
  | 'devices' | 'outdoor' | 'imported';
```

This extends the current `PropCatalogItem` — existing items continue to work, new fields are optional.

### 3. Extended PropCatalogItem Type

```typescript
interface PropCatalogItem {
  // existing fields (unchanged)
  id: string;
  name: string;
  url: string;
  source: 'builtin' | 'user' | 'curated';
  thumbnail?: string;
  category?: string;

  // new fields
  subcategory?: string;
  style?: string;
  tags?: string[];
  dimensions?: { width: number; depth: number; height: number };
  placement?: 'floor' | 'wall' | 'ceiling' | 'table';
  defaultRotation?: [number, number, number];
  haMapping?: { mappable: boolean; defaultDomain?: string; defaultKind?: DeviceKind };
  fileData?: string;          // base64 (existing, used for user imports)
  performance?: { triangles: number; materials: number; fileSizeKB: number };
}
```

### 4. Import + Optimization Pipeline

A new utility module `src/lib/assetPipeline.ts`:

```text
importModel(file)
  → validateFormat(.glb/.gltf only)
  → loadAndParse(GLTFLoader)
  → normalizeScale(auto-detect if model is in cm/mm, convert to meters)
  → centerPivot(move to origin, floor at Y=0)
  → analyzeStats(triangles, materials, textures, file size)
  → warnIfHeavy(>500k tris or >10MB)
  → optionalTextureResize(if any texture >2048px, downscale to 2048)
  → generateThumbnail(render to offscreen canvas, export as webp/png data URL)
  → return { scene, stats, thumbnail, warnings[] }
```

V1 scope (in-browser, no server dependency):
- Format validation
- Load + parse via GLTFLoader
- Bounding box analysis → auto-detect unit (if bbox > 100m, likely cm)
- Center pivot + floor placement
- Stats analysis (triangles, materials, textures)
- Thumbnail generation via offscreen WebGLRenderer (128x128)
- Texture audit (warn if >2048, optionally downscale in-memory)
- Return processed scene + metadata

### 5. Visual Catalog Component

Replace current file-picker list in `FurnishTools.tsx` with a proper catalog panel:

**`src/components/build/furnish/AssetCatalog.tsx`**

```text
┌─────────────────────────────────┐
│ 🔍 Search...                    │
├─────────────────────────────────┤
│ [Alla] [Soffor] [Stolar] ...   │  ← category chips (scrollable)
├─────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│ │thumb│ │thumb│ │thumb│ │thumb│  │  ← 2-column grid
│ │name │ │name │ │name │ │name │  │
│ └────┘ └────┘ └────┘ └────┘   │
│ ┌────┐ ┌────┐                  │
│ │ +  │ │ +  │                  │  ← "Importera" card at end
│ └────┘ └────┘                  │
├─────────────────────────────────┤
│ Placerade (3)                   │  ← existing placed items list
│ • Modern soffa     [🗑]         │
│ • Golvlampa        [🗑]         │
└─────────────────────────────────┘
```

- Reads curated assets from `public/catalog/index.json` (fetched once, cached)
- Merges with user-imported `PropCatalogItem[]` from store
- Thumbnail grid with category filter + text search
- Click thumbnail → place at origin on active floor
- Import button opens existing import dialog (enhanced with optimization)

### 6. Import Dialog Enhancement

Update the existing import flow in `FurnishTools.tsx`:

```text
[Select file] → [Pipeline runs] → [Show results dialog]:
  ┌──────────────────────────────┐
  │ Preview: [thumbnail]         │
  │ Name: [_______________]      │
  │ Category: [Möbler ▾]         │
  │ Subcategory: [Soffor ▾]      │
  │ Typ: [Möbel / Enhet / Dekor] │
  │ HA-mappning: [Nej ▾]         │
  │                              │
  │ Stats: 12.4k △ · 3 mat · OK │
  │ Storlek: 1.2 MB              │
  │                              │
  │ [Importera]  [Avbryt]        │
  └──────────────────────────────┘
```

### 7. HA Mapping in Assets

The `haMapping` field on `PropCatalogItem` connects to existing `DeviceKind` + `haDomainMapping.ts`:

- When placing a model with `haMapping.mappable = true`, automatically create a corresponding `DeviceMarker` at the same position
- The device marker uses `haMapping.defaultKind` (e.g., `'light'`)
- User can then assign an HA entity via the existing device inspector
- Non-mappable furniture (sofas, tables) has no HA integration

### 8. Catalog Loading

```typescript
// src/lib/catalogLoader.ts
let _cache: CatalogAssetMeta[] | null = null;

export async function loadCuratedCatalog(): Promise<CatalogAssetMeta[]> {
  if (_cache) return _cache;
  try {
    const res = await fetch('/catalog/index.json');
    if (!res.ok) return [];
    _cache = await res.json();
    return _cache;
  } catch { return []; }
}
```

Works in both DEV and HOSTED mode — static files in `public/` are always served.

---

## Phased Implementation

### Phase 1 — Foundation (this cycle)
1. Define `CatalogAssetMeta` type + extend `PropCatalogItem` in `types.ts`
2. Create `src/lib/assetPipeline.ts` (validate, normalize, analyze, thumbnail)
3. Create `src/lib/catalogLoader.ts` (load `index.json`, merge with store catalog)
4. Create `public/catalog/index.json` (empty array — ready for curated assets)
5. Build `AssetCatalog.tsx` — thumbnail grid with search + category filter
6. Update `FurnishTools.tsx` to use `AssetCatalog` instead of file-picker list
7. Enhance import dialog with pipeline results + category/subcategory/HA fields

### Phase 2 — Optimization + Thumbnails
- Auto-thumbnail generation on import (offscreen render)
- Texture downscaling for oversized textures
- Unit auto-detection (cm→m conversion)
- Server-side asset persistence for HOSTED mode (extend existing `assets.js` API)

### Phase 3 — Curated Content
- Add first batch of curated GLB models to `public/catalog/`
- Build `index.json` generator script
- Category icons in UI

### Phase 4 — HA-Linked Props
- Auto-create DeviceMarker when placing HA-mappable asset
- Sync prop position ↔ device marker position
- Visual indicator on catalog items that support HA

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/store/types.ts` | Extend `PropCatalogItem` with new optional fields |
| `src/lib/assetPipeline.ts` | **New** — import validation, normalization, analysis, thumbnail |
| `src/lib/catalogLoader.ts` | **New** — fetch + cache curated catalog |
| `src/components/build/furnish/AssetCatalog.tsx` | **New** — visual thumbnail grid catalog |
| `src/components/build/furnish/FurnishTools.tsx` | Replace file-picker with AssetCatalog, enhance import dialog |
| `public/catalog/index.json` | **New** — empty manifest ready for curated assets |

