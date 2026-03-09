

# BJORQ Asset Wizard Integration — v0.7.2

## Architecture

Wizard becomes an external asset source alongside the existing curated catalog and user imports. Connection is configured under Settings → Anslutning. Wizard assets appear as a new source filter in the existing AssetCatalog inside BuildModeV2.

```text
Settings / Anslutning          Build / Möbler (AssetCatalog)
┌──────────────────────┐       ┌──────────────────────────┐
│ Home Assistant       │       │ [Alla] [Katalog] [Mina] [Wizard] │
│ Location             │       │ ┌────┐ ┌────┐ ┌────┐    │
│ WiFi                 │       │ │sofa│ │lamp│ │wiz │    │
│ ★ Asset Wizard  ←NEW │       │ └────┘ └────┘ └────┘    │
└──────────────────────┘       └──────────────────────────┘
```

## Files to create

### 1. `src/lib/wizardClient.ts` — Wizard API client

- Stores connection URL in zustand (new `wizard` slice)
- Functions: `testWizardConnection()`, `fetchWizardCatalog()`, `getWizardModelUrl(assetId)`
- All URLs built relative to configured base URL (ingress-safe)
- Returns typed `WizardAsset[]` with `id`, `name`, `category`, `subcategory`, `boundingBox`, `center`, `estimatedScale`, `triangleCount`, `fileSize`, `thumbnail`
- Caches catalog in memory after first fetch

### 2. `src/components/home/cards/WizardConnectionPanel.tsx` — Settings panel

- URL input field
- Test Connection button → calls `GET /health` + `GET /version`
- Status indicator (disconnected/connected/error) with version display
- Save / Reset buttons
- Persists URL to store (synced to server in hosted mode)
- Same glass-panel styling as HAConnectionPanel

## Files to modify

### 3. `src/store/types.ts` — Add Wizard state

```typescript
export interface WizardConnection {
  url: string;
  status: 'disconnected' | 'connected' | 'error';
  version?: string;
  lastChecked?: string;
}
```

Add to `AppState`:
- `wizard: WizardConnection`
- `setWizard: (changes: Partial<WizardConnection>) => void`

### 4. `src/store/useAppStore.ts` — Add wizard slice

- Initial state: `wizard: { url: '', status: 'disconnected' }`
- `setWizard` action that merges changes + syncs to server profile
- Include in profile sync payload

### 5. `src/components/home/DashboardGrid.tsx` — Add WizardConnectionPanel

In `SettingsCategory`, under the "Anslutning" section, add `<WizardConnectionPanel />` next to HAConnectionPanel, LocationSettings, WifiPanel.

### 6. `src/components/build/BuildModeV2.tsx` — Integrate Wizard assets into AssetCatalog

This is the main integration point. Changes to the inlined `AssetCatalog` component:

- Add `ACSourceFilter` value `'wizard'`
- Fetch wizard catalog on mount (if connected) → convert to `ACEntry[]` with `source: 'wizard'`
- Add wizard entries to `allEntries` array
- Add "Wizard" source filter button
- In `handlePlaceEntry`: when `entry.source === 'wizard'`, fetch model from `/catalog/asset/:id/model`, create blob URL, add to prop catalog, place prop
- Use wizard `boundingBox` + `estimatedScale` for initial scale: compute scale so largest dimension ~= 1m (or use `estimatedScale` directly)
- Use wizard `center` to offset model origin to floor level

**Placement logic using Wizard metadata:**
```typescript
// Scale: use estimatedScale from wizard, fallback to bounding-box based
const scale = wizardMeta.estimatedScale || 1;
// Floor placement: offset Y by -center.y * scale so bottom sits on floor
const yOffset = -(wizardMeta.center?.y ?? 0) * scale;
addProp({ ..., scale: [scale, scale, scale], position: [tx, yOffset, tz] });
```

### 7. Version bump + docs

- `package.json` → `0.7.2`
- `bjorq_dashboard/config.yaml` → `0.7.2`
- `README.md` badge → `0.7.2`
- `CHANGELOG.md` → new `[0.7.2]` section
- `docs/08-developer-notes.md` → add Wizard client docs

## Error handling

- Wizard unavailable: source filter hidden, no wizard entries shown, no crash
- Model fetch fails: toast error, scene unaffected
- Missing thumbnail: category icon placeholder (existing behavior)
- Network timeout: 5s abort signal on all wizard fetches

## Scope boundaries

**In scope:** connect, browse, place, scale/position from metadata
**Out of scope:** drag-and-drop from catalog, 2D plan view icons for wizard assets, editing wizard metadata from dashboard, bidirectional sync

