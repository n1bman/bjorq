

# Fix Wizard Connection Persistence + Improve Panel UX

## Problem

Two root causes found:

1. **Wizard state is saved to server but never restored on boot.** `syncProfileToServer()` correctly includes `wizard`, but `initHostedMode()` never reads `p.wizard` from the bootstrap response. In DEV mode, `partialize` also omits `wizard` from localStorage.

2. **No auto-reconnect on startup.** Even if the state were restored, the dashboard doesn't verify the Wizard connection on boot, so status would show stale data.

3. **Panel lacks Reconnect/Reload/Reset buttons and asset count** — unlike the HA panel which shows entity count and has action buttons.

## Changes

### 1. Restore wizard state on bootstrap (`src/store/useAppStore.ts`)

In `initHostedMode()`, add wizard restore alongside other profile fields:
```typescript
if (p.wizard) stateUpdate.wizard = p.wizard;
```

In `partialize` (DEV mode localStorage), add wizard to the persisted object:
```typescript
wizard: {
  url: state.wizard.url,
  status: 'disconnected' as const,
  version: state.wizard.version,
},
```

### 2. Auto-verify Wizard on boot (`src/App.tsx` or `src/main.tsx`)

After store hydration/bootstrap, if `wizard.url` is set, run `testWizardConnection()` silently and update status. This mirrors how HA auto-connects.

Add a small hook or effect in `App.tsx`:
```typescript
// After init, if wizard URL exists, verify connection
useEffect(() => {
  const { wizard, setWizard } = useAppStore.getState();
  if (!wizard.url) return;
  testWizardConnection().then(result => {
    if (result.ok) {
      setWizard({ status: 'connected', version: result.version, lastChecked: new Date().toISOString() });
    } else {
      setWizard({ status: 'error' });
    }
  });
}, []);
```

### 3. Upgrade WizardConnectionPanel UX (`src/components/home/cards/WizardConnectionPanel.tsx`)

Mirror the HA panel pattern:
- Show **asset count** next to "Ansluten" status (fetch catalog on connect, show count)
- Add **Reconnect / Refresh / Reset** action buttons grid (like HA panel's 3-button grid)
- Show last checked timestamp
- On "Refresh": re-fetch catalog and update asset count
- On "Reconnect": re-test connection + re-fetch catalog

### 4. No changes needed on Wizard side

The Wizard API (`/libraries`, `/libraries/:library/index`, `/assets/:id/model`) is correct and complete. The issue is entirely dashboard-side: persistence and catalog fetching logic. The `fetchWizardCatalog` fix from the previous commit (two-step library→index fetch) should work correctly with the Wizard's API.

One thing to verify: that assets in the Wizard have `lifecycleStatus: 'published'` — only published assets appear in the library index. If you upload models via the Wizard UI, make sure to run "Ingest" to publish them to the catalog.

## Files changed

| File | Change |
|------|--------|
| `src/store/useAppStore.ts` | Restore `wizard` from bootstrap profiles; add to `partialize` |
| `src/components/home/cards/WizardConnectionPanel.tsx` | Add Reconnect/Refresh/Reset buttons, asset count display, auto-fetch catalog on connect |
| `src/App.tsx` | Add Wizard auto-verify effect on boot |

