

# Plan: Fix Build Errors + 3-Mode Architecture (HOSTED / DEV / DEV-HOSTED)

## Build Error Fixes (2 issues)

### 1. CSS `@import` order — `src/index.css`
Move the Google Fonts `@import` to line 1, before the `@tailwind` directives. CSS spec requires `@import` before all other statements.

### 2. Toaster import — cascading failure
The toaster resolve error is caused by the CSS build failing first. Fixing the CSS fixes both.

---

## 3-Mode Architecture

### Mode Detection — `src/lib/apiClient.ts`

Add a mode resolver that runs once at startup:

```typescript
type AppMode = 'HOSTED' | 'DEV';

// Resolution logic:
// 1. If import.meta.env.VITE_FORCE_DEV === '1' → DEV (skip probe)
// 2. If import.meta.env.VITE_FORCE_HOSTED === '1' → HOSTED (fail loudly if probe fails)
// 3. Probe GET /api/bootstrap with 1000ms timeout
//    - OK → HOSTED
//    - Fail → DEV
```

Rename existing `isHosted()` → use the new mode resolver. `isHostedSync()` returns `mode === 'HOSTED'`.

### DEV Mode Behavior

- **No `/api/*` calls** — all state from Zustand + localStorage (current behavior)
- **Direct HA WebSocket** — `useHomeAssistant` connects with `wsUrl` + `token` from store (current behavior)
- **Banner**: "DEV — HA token lagrad lokalt (ej rekommenderat för produktion)"

### HOSTED Mode Behavior

- **Load via `/api/bootstrap`** — config, profiles, projects (current `initHostedMode()`)
- **Disable localStorage** — `partialize` returns `{}` (already implemented)
- **HA via proxy** — REST polling `/api/ha/states`, service calls via `/api/ha/services/*`
- **No token in browser** — token never leaves server
- **Autosave** — debounced sync for profiles + projects (already implemented)
- **Banner**: "HOSTED — Diskpersistens aktiv"

### File Changes

| File | Change |
|------|--------|
| `src/index.css` | Move `@import` to line 1 |
| `src/lib/apiClient.ts` | Replace `isHosted()`/`isHostedSync()` with mode resolver supporting env overrides; keep all API functions |
| `src/hooks/useHomeAssistant.ts` | Already has dual path (hosted=REST poll, non-hosted=WebSocket). No structural change needed, just ensure it reads mode correctly |
| `src/pages/Index.tsx` | Update banner text based on mode; in DEV show dev warning, in HOSTED show hosted badge |
| `src/store/useAppStore.ts` | No change — already checks `isHostedSync()` for partialize and sync |

### Minimal touches — no store refactor needed

The current code already has the dual paths:
- `useHomeAssistant` already branches on `isHostedSync()` for REST polling vs WebSocket
- `partialize` already returns `{}` when hosted
- `syncProfileToServer`/`syncProjectToServer` already check `isHostedSync()`

The only real change is making mode detection support env var overrides and ensuring Lovable preview (which is `import.meta.env.DEV === true` without `VITE_FORCE_HOSTED`) always falls into DEV mode without attempting the `/api/bootstrap` probe.

