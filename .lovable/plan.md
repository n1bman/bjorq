

# Fix Wizard Thumbnails + Redesign Asset Catalog for Scale

## Problem 1: Missing Thumbnails

The Wizard API exposes `GET /assets/:id/thumbnail` for every asset, but the catalog only uses `w.thumbnail` from the index response. If the index doesn't include a `thumbnail` field (which seems to be the case based on screenshot showing placeholder icons), no thumbnail is generated.

**Fix**: When building wizard entries in `allEntries`, always fall back to `getWizardThumbnailUrl(w.id)` — this constructs the direct URL to the Wizard's thumbnail endpoint regardless of whether the index includes a thumbnail path.

```typescript
// Line ~221 in BuildModeV2.tsx
let thumb: string | undefined;
if (w.thumbnail) {
  const base = useAppStore.getState().wizard.url.replace(/\/+$/, '');
  thumb = w.thumbnail.startsWith('http') ? w.thumbnail : `${base}${...}`;
}
// ADD: Always fall back to the direct thumbnail endpoint
if (!thumb) {
  const base = useAppStore.getState().wizard.url.replace(/\/+$/, '');
  thumb = `${base}/assets/${encodeURIComponent(w.id)}/thumbnail`;
}
```

This way every Wizard asset always has a thumbnail URL. The `onError` handler on the `<img>` tag already gracefully falls back to the icon if the URL 404s.

## Problem 2: Cluttered Catalog UI

With 30-50+ models the flat grid becomes unnavigable. The current tiny badges ("Wizard", "Imported", "Synced") are hard to read and don't visually separate sources.

### Redesign approach

1. **Group by source with collapsible sections** instead of flat grid:
   - "Wizard" section (collapsible, shows count)
   - "Mina" section (imported/user models)
   - "Katalog" section (curated)

2. **Visual clarity per card**:
   - Remove the overlapping badges in the top-right corner
   - Use a subtle left-border color to indicate source (orange = Wizard, blue = imported, gray = catalog)
   - Show status as a single small icon, not text badge

3. **Sticky category filter bar** so it stays visible while scrolling

4. **List/grid toggle** — add a compact list view option for when there are many items (name + dims + icon, one line per item)

### Files changed

| File | Change |
|------|--------|
| `src/lib/wizardClient.ts` | No changes needed |
| `src/components/build/BuildModeV2.tsx` | Fix thumbnail fallback for wizard entries; redesign catalog grid with grouped sections, left-border source indicators, list/grid toggle, sticky filters |

### Version bump

- Bump to v1.0.5 in `package.json`, `server/package.json`, `bjorq_dashboard/config.yaml`, `server/api/backups.js`
- Add CHANGELOG entry for thumbnail fix and catalog UX redesign

