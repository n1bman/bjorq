

# Fix: Always show Wizard tab in Möbler when connected

## Problem

The "✨ Wizard" source filter in the furniture panel only appears when `wizardAssets.length > 0`. If the catalog fetch fails silently (CORS, network timeout, empty catalog), the tab is invisible — so even with a successful connection in Settings, there's no trace of Wizard in Build mode.

Additionally, there's no loading indicator or error feedback in the furniture panel for the Wizard catalog fetch.

## Solution

### 1. Show Wizard tab whenever connected (not just when assets exist)

In `BuildModeV2.tsx`, change `hasWizard` logic:

```typescript
// Before:
const hasWizard = wizardAssets.length > 0 || allEntries.some(e => e.wizardMode === 'synced');

// After:
const hasWizard = wizardStatus === 'connected' || wizardAssets.length > 0 || allEntries.some(e => e.wizardMode === 'synced');
```

### 2. Add loading + error state for Wizard catalog fetch

Add `wizardLoading` and `wizardError` state variables. Update the `useEffect` that fetches the catalog to track these states. Show feedback in the asset grid when the Wizard filter is selected:

- **Loading**: spinner + "Hämtar Wizard-katalog..."
- **Error**: error message with retry button
- **Empty**: "Inga assets i Wizard-katalogen" message
- **Disconnected** (viewing wizard filter without connection): prompt to connect in Settings

### 3. Better error logging

Add `console.error` alongside `console.warn` for catalog fetch failures, and surface a toast on first failure so the user knows something went wrong.

## Files modified

| File | Change |
|------|--------|
| `src/components/build/BuildModeV2.tsx` | `hasWizard` logic, loading/error states, UI feedback when Wizard tab selected |

## Scope

Small, focused fix. No new files. No version bump needed (bug fix within v0.7.3).

