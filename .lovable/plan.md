

# Fix: Align wizardClient.ts with actual Wizard API

## Problem

The Dashboard's `wizardClient.ts` uses incorrect API routes that don't match the actual Wizard endpoints. This is why the catalog fetch silently fails and no assets appear.

| What Dashboard calls | What Wizard actually exposes |
|---|---|
| `GET /catalog/index` | `GET /libraries` |
| `GET /catalog/asset/:id/model` | `GET /assets/:id/model` |
| `GET /catalog/asset/:id/thumbnail` | `GET /assets/:id/thumbnail` |
| `GET /assets/:id/meta` | `GET /assets/:id/meta` (correct) |

Additionally, the placeholder URL in `WizardConnectionPanel.tsx` says port `8099` but the Wizard exposes port `3500`.

## Changes

### 1. `src/lib/wizardClient.ts`

- `fetchWizardCatalog`: change `/catalog/index` → `/libraries`
- Parse response: the `/libraries` endpoint likely returns a different shape — handle both flat array and nested structures (e.g. `{ libraries: [...] }` or assets grouped by library)
- `getWizardModelUrl`: change `/catalog/asset/:id/model` → `/assets/:id/model`
- `getWizardThumbnailUrl`: change `/catalog/asset/:id/thumbnail` → `/assets/:id/thumbnail`
- `downloadWizardModel`: change `/catalog/asset/:id/model` → `/assets/:id/model`
- `downloadWizardThumbnail`: change `/catalog/asset/:id/thumbnail` → `/assets/:id/thumbnail`

### 2. `src/components/home/cards/WizardConnectionPanel.tsx`

- Update placeholder from `http://homeassistant.local:8099` → `http://<ha-ip>:3500`

## Scope

Route fixes only — no UI, no new features.

