

# Fix: Wizard catalog returns 0 assets

## Root cause

`fetchWizardCatalog` calls `/libraries/:library/index` but silently catches and ignores errors (line 74: `catch { /* skip */ }`). If the endpoint returns 404, an unexpected format, or an error, we get 0 assets with no feedback.

The Wizard also exposes `GET /catalog/index` which returns the full catalog manifest directly — this is more reliable and doesn't require the two-step library dance.

## Fix

Update `fetchWizardCatalog` in `src/lib/wizardClient.ts`:

1. **Primary**: Try `GET /catalog/index` — returns the full catalog manifest directly
2. **Fallback**: If that fails, try the two-step `/libraries` → `/libraries/:lib/index` approach
3. **Add `console.warn` logging** so failures are visible in logs instead of silently swallowed
4. **Increase timeout** for catalog fetches (catalog index can be larger than a health check)

### Code change

```typescript
export async function fetchWizardCatalog(force = false): Promise<WizardAsset[]> {
  const currentUrl = getBaseUrl();
  if (_catalogCache && !force && _catalogCacheUrl === currentUrl) return _catalogCache;

  const allAssets: WizardAsset[] = [];

  // Strategy 1: Try /catalog/index (single call, most reliable)
  try {
    const res = await wizardFetch('/catalog/index', { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json();
      const entries = Array.isArray(data) ? data : (data.assets ?? data.items ?? []);
      for (const entry of entries) {
        if (entry.id) allAssets.push(entry);
      }
    }
  } catch (e) {
    console.warn('[Wizard] /catalog/index failed:', e);
  }

  // Strategy 2: If /catalog/index returned nothing, try /libraries/:lib/index
  if (allAssets.length === 0) {
    try {
      const libRes = await wizardFetch('/libraries');
      if (libRes.ok) {
        const libData = await libRes.json();
        const libraries = Array.isArray(libData)
          ? libData.map(l => typeof l === 'string' ? l : l.name || l.id || 'default')
          : ['default'];
        for (const lib of libraries) {
          try {
            const res = await wizardFetch(`/libraries/${encodeURIComponent(lib)}/index`, { signal: AbortSignal.timeout(10000) });
            if (!res.ok) { console.warn(`[Wizard] /libraries/${lib}/index → ${res.status}`); continue; }
            const data = await res.json();
            const entries = Array.isArray(data) ? data : (data.assets ?? data.items ?? []);
            for (const entry of entries) {
              if (entry.id) allAssets.push(entry);
            }
          } catch (e) { console.warn(`[Wizard] /libraries/${lib}/index error:`, e); }
        }
      }
    } catch (e) {
      console.warn('[Wizard] /libraries fetch failed:', e);
    }
  }

  _catalogCache = allAssets;
  _catalogCacheUrl = currentUrl;
  return allAssets;
}
```

## Files changed

| File | Change |
|------|--------|
| `src/lib/wizardClient.ts` | Rewrite `fetchWizardCatalog` with dual-strategy + logging |

## No Wizard-side changes needed

The Wizard API is correctly set up. Both `/catalog/index` and `/libraries/:library/index` are documented as working endpoints. The problem is dashboard-side error handling.

