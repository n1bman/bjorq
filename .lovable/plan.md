

# Overhaul: Import-Only Wizard + Fix Asset Lifecycle

## Summary

Remove "Sync" mode entirely. Wizard becomes import-only. Fix deletion, duplicates, thumbnails, and ghost placement bugs. This addresses issues 1-4, 6-8 in one coherent change.

Issue 5 (cursor-follow placement) is a separate UX feature and will be noted but not included in this scope.

## Root Cause Analysis

Most bugs (duplicates, ghost instances, stale references, 404 on reload) stem from the "synced" mode which creates a runtime dependency on Wizard. When Wizard assets are deleted or unavailable, synced references break. The dual-mode dialog also creates confusion and code complexity.

## Architecture Change

```text
BEFORE:  Wizard ──┬── Sync (live ref, blob URL, breaks on restart)
                   └── Import (local copy, persistent)

AFTER:   Wizard ──── Import only (local copy, always persistent)
```

## Changes

### 1. Remove Sync Mode (fixes issues 1, 3, 6, 7)

**`src/components/build/BuildModeV2.tsx`**

- Remove `handleWizardSync` function entirely
- Replace the dual-mode dialog with a single "Import" action
  - When clicking a Wizard catalog entry, immediately start import (no dialog)
  - Show a small loading toast during download
- Remove `wizardMode === 'synced'` branches from `handlePlaceEntry`
- In `allEntries` mapping, remove the `wizardMode: 'synced'` source classification
- Delete the dual-mode Dialog component (lines 835-866)

**`src/store/types.ts`**

- Keep `wizardMode` field on `PropCatalogItem` but only allow `'imported'` (for backwards compat, treat any existing `'synced'` as needing re-import)

### 2. Fix Deletion (fixes issue 2)

**`src/components/build/BuildModeV2.tsx`**

- The delete button currently only shows for `entry.source === 'user' && !entry.wizardMode`
- Change condition to show delete for ALL user/imported entries including `wizardMode === 'imported'`
- New condition: `entry.source === 'user' || entry.wizardMode === 'imported'`
- Add confirmation dialog before delete

### 3. Fix Duplicate Catalog Entries (fixes issue 3)

**`src/components/build/BuildModeV2.tsx`** — in `handleWizardImport` (now the only path):

- Before adding to catalog, check if `catalog.find(c => c.wizardAssetId === wm.id)` already exists
- If exists, skip `addToCatalog` and just place a new prop instance using the existing catalog entry
- This prevents the same Wizard asset from creating multiple catalog entries

### 4. Fix Thumbnails (fixes issue 4)

Already partially fixed in v1.0.5. Additional fix:

- In the Wizard import flow, when downloading the thumbnail blob, convert it to a base64 data URL and store it on the catalog item (not a blob URL which expires)
- This ensures thumbnails persist across sessions

### 5. Migrate Existing Synced Assets

**`src/components/build/BuildModeV2.tsx`** or **`src/store/useAppStore.ts`**:

- On startup, find any catalog items with `wizardMode === 'synced'`
- Show them with a warning badge "Kräver re-import" 
- Clicking them triggers a re-import from Wizard (if available) or shows error

### 6. Catalog Source Filter Cleanup

- Remove "synced" from source filter logic
- Wizard section in catalog only shows un-imported Wizard assets
- "Mina" section shows all imported assets (including wizard-imported)

## Files Changed

| File | Change |
|------|--------|
| `src/components/build/BuildModeV2.tsx` | Remove sync mode, single-click import, fix delete conditions, fix duplicates, persist thumbnails as base64 |
| `package.json` | Bump to v1.0.6 |
| `server/package.json` | Bump to v1.0.6 |
| `bjorq_dashboard/config.yaml` | Bump to v1.0.6 |
| `server/api/backups.js` | Bump to v1.0.6 |
| `CHANGELOG.md` | Document all fixes |

## Not in Scope

- **Issue 5 (cursor-follow placement)**: Requires significant 3D interaction refactor. Tracked separately.
- Store type changes for `wizardMode` are minimal — we keep the field but stop creating `'synced'` entries.

