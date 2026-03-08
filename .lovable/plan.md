

## Catalog Hardening & Management Pass

A focused stability pass across 7 areas — no broad redesign, just making the existing system robust and production-friendly.

---

### 1. End-to-end validation of curated catalog loading

**Problem**: No validation of `index.json` entries — malformed data, missing model paths, or bad categories silently break the UI.

**Changes**:
- `catalogLoader.ts`: Validate each entry on load — require `id`, `name`, `model`, `category`. Filter out invalid entries with a console warning.
- `AssetCatalog.tsx`: Add an `onError` handler on thumbnail `<img>` tags to swap in the "3D" placeholder when thumb URL is broken.

---

### 2. Upload → ingest → catalog flow hardening

**Problem**: Server ingest endpoint doesn't check for existing folders, doesn't validate the GLB file, and has no error recovery for partial writes.

**Changes**:
- `server/api/assets.js` (`POST /catalog/ingest`):
  - Check `modelFile.mimetype` or extension to reject non-GLB files early.
  - Before writing, check if `assetDir` already exists — return `409 Conflict` with the existing asset's metadata, letting the client decide.
  - Write model to a `.tmp` file first, then rename (atomic write pattern already used elsewhere).
- `AssetCatalog.tsx`: Handle 409 response — show a confirm dialog "Asset med detta ID finns redan. Ersätt?" before retrying with `?force=true`.

---

### 3. Missing thumbnail / metadata graceful handling

**Problem**: Assets without thumbnails show a bare "3D" box with no context. Assets with partial metadata show nothing useful.

**Changes**:
- `AssetCatalog.tsx` catalog cards: When no thumbnail, show a colored placeholder with category icon (Lucide: `Sofa`, `Lamp`, `Flower2`, `Box`, etc.) instead of plain "3D" text.
- `server/api/assets.js` (scanAssets): If `meta.json` exists but is missing required fields (`id`, `name`), merge defaults from folder name before indexing.
- Import dialog: If pipeline `generateThumbnail` fails (returns null), show a warning "Thumbnail kunde inte genereras" but still allow import.

---

### 4. Naming / ID / folder collision prevention

**Problem**: Two assets with the same name produce the same slug ID, silently overwriting each other.

**Changes**:
- `server/api/assets.js` (`POST /catalog/ingest`): After generating the slug from name, check if folder exists. If so, append `-2`, `-3`, etc. until unique. Return the final `assetId` to the client.
- `AssetCatalog.tsx` (client-side user catalog): Before `addToCatalog`, check if `catalog.find(c => c.id === catalogId)` exists; if so, append a random suffix.
- `scripts/generate-catalog-index.js`: Warn (console) if duplicate IDs are found during indexing; keep last-found.

---

### 5. Explicit source distinction in the UI

**Problem**: Curated and user-imported assets look identical in the grid. No way to tell which is permanent vs. session-only.

**Changes**:
- `AssetCatalog.tsx` catalog cards: Add a subtle source badge:
  - Curated: small `Archive` icon (top-right) in muted style
  - User: small `User` icon (top-right)
  - These coexist with the existing HA ⚡ badge (top-left)
- Category filter pills: Add a source filter toggle ("Alla" / "Katalog" / "Mina") above or alongside the category row.
- Delete button: Only show on `user` source entries (already done). For `curated` entries show nothing in DEV mode; in hosted mode, show a "Hantera" context action (see point 7).

---

### 6. Richer catalog card metadata

**Problem**: Cards only show name + thumbnail. No dimensions, performance rating, or category context.

**Changes**:
- `AssetCatalog.tsx` catalog cards: Below the name, add a subtle metadata line:
  - Dimensions if available: `0.8×0.5×1.2m` in `text-[8px] text-muted-foreground`
  - Performance dot: green/yellow/red circle based on `ratePerformance()`
  - Subcategory tag if different from category
- Keep layout compact — these extras only appear on hover or always in `text-[8px]`.

---

### 7. Curated asset management actions (hosted mode)

**Problem**: No way to edit metadata, replace thumbnail, or remove a curated asset after ingestion.

**Changes**:
- **Server endpoints** (`server/api/assets.js`):
  - `PUT /api/catalog/:assetId/meta` — update meta.json fields, re-run `regenerateCatalogIndex()`
  - `PUT /api/catalog/:assetId/thumbnail` — accept new image upload, overwrite thumb file, reindex
  - `DELETE /api/catalog/:assetId` — remove folder, reindex
- **API client** (`src/lib/apiClient.ts`): Add `updateCatalogMeta()`, `replaceCatalogThumbnail()`, `deleteCatalogAsset()` helpers.
- **UI** (`AssetCatalog.tsx`): On curated assets in hosted mode, add a small `Settings` (gear) icon that opens a management dialog with:
  - Edit name, category, subcategory, placement, HA mapping
  - Replace thumbnail (file picker)
  - Delete asset (with confirmation)
  - All actions call the server, then refresh the catalog cache

---

### Files to modify

| File | Changes |
|---|---|
| `src/lib/catalogLoader.ts` | Entry validation on load |
| `src/components/build/furnish/AssetCatalog.tsx` | Source badges, richer cards, collision check, thumbnail fallback icons, management dialog, source filter |
| `server/api/assets.js` | Collision detection, GLB validation, management endpoints (PUT meta, PUT thumbnail, DELETE), atomic writes |
| `src/lib/apiClient.ts` | `updateCatalogMeta`, `replaceCatalogThumbnail`, `deleteCatalogAsset` helpers |
| `scripts/generate-catalog-index.js` | Duplicate ID warning |

No new dependencies required. All changes are additive — existing behavior preserved.

