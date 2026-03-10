

# Two issues found

## 1. Dashboard server crash (backups.js) — already fixed, needs deploy

The log still shows the `ENOENT: /app/package.json` crash loop. This fix (hardcoded `APP_VERSION`) is already in the code but **has not been pushed/deployed yet**. You need to push v1.0.1 to GitHub so the Docker image rebuilds.

No code changes needed — just push and update the add-on.

## 2. Wizard catalog fetch uses wrong endpoint — this is the real bug

**Root cause**: `wizardClient.ts` calls `GET /libraries` which returns a list of *libraries* (e.g. `[{name: "default", ...}]`), not individual assets. The dashboard treats each library entry as a `WizardAsset`, so when the user clicks "Default Library" it requests `GET /assets/default/model` — the Wizard correctly returns 404 because "default" is a library name, not an asset ID.

**The Wizard API structure** (from its README):

| Endpoint | Returns |
|----------|---------|
| `GET /libraries` | List of libraries (currently just "default") |
| `GET /libraries/:library/index` | Full catalog index for a library |
| `GET /assets/:id/model` | GLB model for an asset |
| `GET /assets/:id/thumbnail` | Thumbnail for an asset |

**Fix**: Change `fetchWizardCatalog` to first call `/libraries` to get library names, then call `/libraries/:library/index` for each library to get actual asset entries. For v1, there is only one library ("default"), so we can simplify to just calling `/libraries/default/index`.

### Files changed

| File | Change |
|------|--------|
| `src/lib/wizardClient.ts` | `fetchWizardCatalog`: call `/libraries/default/index` instead of `/libraries`. Parse the response to map catalog entries to `WizardAsset` format (id, name, category, thumbnail, boundingBox, etc.) |

### Implementation detail

```typescript
// wizardClient.ts — fetchWizardCatalog
export async function fetchWizardCatalog(force = false): Promise<WizardAsset[]> {
  const currentUrl = getBaseUrl();
  if (_catalogCache && !force && _catalogCacheUrl === currentUrl) return _catalogCache;
  
  // Step 1: Get library list
  const libRes = await wizardFetch('/libraries');
  if (!libRes.ok) throw new Error(`Wizard libraries fetch failed: ${libRes.status}`);
  const libData = await libRes.json();
  const libraries: string[] = Array.isArray(libData) 
    ? libData.map((l: any) => typeof l === 'string' ? l : l.name || l.id || 'default')
    : ['default'];
  
  // Step 2: Fetch catalog index for each library
  const allAssets: WizardAsset[] = [];
  for (const lib of libraries) {
    const res = await wizardFetch(`/libraries/${encodeURIComponent(lib)}/index`);
    if (!res.ok) continue;
    const data = await res.json();
    const entries = Array.isArray(data) ? data : (data.assets ?? data.items ?? []);
    for (const entry of entries) {
      if (entry.id) allAssets.push(entry);
    }
  }
  
  _catalogCache = allAssets;
  _catalogCacheUrl = currentUrl;
  return allAssets;
}
```

This will return actual assets (like `lampa-1`, `kivik-soffa`) with correct IDs, so `/assets/lampa-1/model` will resolve correctly.

