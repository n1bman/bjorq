

# Wizard Dual-Mode Asset Integration — v0.7.3

## Summary

Extend the existing Wizard integration (v0.7.2) to support dual-mode assets (Synced vs Imported), align API routes with the actual Wizard contract, add asset badges, and implement the import-to-dashboard flow.

## Current State

Already in place from v0.7.2:
- `wizardClient.ts` with `testWizardConnection`, `fetchWizardCatalog`, `getWizardModelUrl`
- `WizardConnectionPanel` in Settings → Anslutning
- `WizardConnection` state in store
- Wizard source filter in AssetCatalog (`BuildModeV2.tsx`)
- Basic placement with metadata (`estimatedScale`, `center`)

## What Changes

### 1. Update `wizardClient.ts` — align with real Wizard API + add helpers

Current routes already match (`/catalog/index`, `/catalog/asset/:id/model`). Add:
- `getWizardThumbnailUrl(assetId)` → `/catalog/asset/:id/thumbnail` (dedicated endpoint instead of relying on metadata `thumbnail` field)
- `getWizardMetaUrl(assetId)` → `/assets/:id/meta`
- `fetchWizardAssetMeta(assetId)` → fetch full metadata from Wizard
- `downloadWizardModel(assetId)` → fetch model as blob (for import flow)
- `downloadWizardThumbnail(assetId)` → fetch thumbnail as blob (for import flow)

### 2. Update `PropCatalogItem` type — track wizard asset mode

Add fields to `PropCatalogItem` in `types.ts`:
```typescript
wizardAssetId?: string;         // original Wizard asset ID
wizardBaseUrl?: string;         // Wizard URL at time of import/sync
wizardMode?: 'synced' | 'imported';  // dual-mode tracking
wizardMeta?: {                  // metadata snapshot
  boundingBox?: { min: [number,number,number]; max: [number,number,number] };
  center?: { x: number; y: number; z: number };
  estimatedScale?: number;
  triangleCount?: number;
  fileSize?: number;
  category?: string;
  subcategory?: string;
};
```

### 3. Update `ACEntry` + asset card rendering in `BuildModeV2.tsx`

- Add `wizardMode` field to `ACEntry`: `'synced' | 'imported' | undefined`
- Show badges on asset cards: small colored badge saying "Wizard", "Synced", or "Imported"
- Source icon: Wand2 icon for wizard assets instead of Archive/User
- When clicking a Wizard asset: show a small action dialog with two buttons:
  - **"Använd synkad"** (Use as Synced) — references Wizard URL directly, stores `wizardMode: 'synced'` on the catalog entry
  - **"Importera till Dashboard"** (Import to Dashboard) — downloads model + thumbnail from Wizard, stores locally with `wizardMode: 'imported'`
- Imported wizard assets show in both "Alla" and "Mina" filters (since they're now local)
- Synced wizard assets show in "Alla" and "Wizard" filters

### 4. Synced asset placement flow

When user clicks "Använd synkad":
1. Model URL points to `wizardBaseUrl/catalog/asset/:id/model` (live reference)
2. Thumbnail URL points to `wizardBaseUrl/catalog/asset/:id/thumbnail`
3. `PropCatalogItem` stored with `source: 'user'`, `wizardMode: 'synced'`, `wizardAssetId`, `wizardBaseUrl`
4. Model fetched as blob for 3D rendering (same as current flow)
5. Use wizard metadata for scale/placement

### 5. Import asset flow

When user clicks "Importera till Dashboard":
1. Fetch model blob from `/catalog/asset/:id/model`
2. Fetch thumbnail blob from `/catalog/asset/:id/thumbnail` (fallback: skip)
3. In hosted mode: upload via `uploadPropAsset` to server storage
4. In DEV mode: create blob URLs, store base64 if under 4MB
5. `PropCatalogItem` stored with `source: 'user'`, `wizardMode: 'imported'`, `wizardAssetId`
6. Wizard no longer required for this asset
7. Use wizard metadata for scale/placement

### 6. Source filter updates

Current filters: `all | curated | user | wizard`

Update logic:
- `wizard` filter: shows only `wizardMode: 'synced'` entries from live Wizard catalog
- `user` filter: shows user imports AND `wizardMode: 'imported'` assets
- `all`: shows everything
- Already-imported wizard assets should not duplicate in the wizard source view

### 7. Error handling

- Synced asset with Wizard offline: toast "Wizard ej tillgänglig — modell kan inte laddas"
- Import fails: toast error, no scene change
- Missing thumbnail from Wizard: use category icon placeholder (already handled)

### 8. Version bump + docs

- `package.json`, `config.yaml`, `README.md` → `0.7.3`
- `CHANGELOG.md` → new `[0.7.3]` section documenting dual-mode Wizard assets
- `docs/08-developer-notes.md` → document `wizardMode` on `PropCatalogItem`

## Files modified

| File | Change |
|------|--------|
| `src/lib/wizardClient.ts` | Add thumbnail/meta/download helpers |
| `src/store/types.ts` | Add wizard fields to `PropCatalogItem` |
| `src/components/build/BuildModeV2.tsx` | Dual-mode dialog, badges, updated placement flows |
| `package.json` | Version → 0.7.3 |
| `bjorq_dashboard/config.yaml` | Version → 0.7.3 |
| `README.md` | Badge → 0.7.3 |
| `CHANGELOG.md` | Add 0.7.3 section |
| `docs/08-developer-notes.md` | Document wizard dual-mode |

## Scope boundaries

**In scope:** dual-mode (synced/imported), badges, action dialog, import flow, updated API routes
**Out of scope:** drag-and-drop, asset versioning notifications, batch import, 2D plan icons for wizard assets

