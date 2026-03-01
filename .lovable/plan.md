

# Plan: bjorQ Dashboard — Disk-first + Node Host + Settings UI + GitHub Release

## Overview

Add an Express server that owns all persistent data on disk (`data/`). Frontend detects hosted mode and routes all reads/writes through `/api/*`, disabling localStorage persistence. Settings UI gets a compact 2-column layout. GitHub Actions packages releases for Windows/Linux.

**Lovable limitation**: Server files are created as source but only run when cloned locally.

## Architecture

```text
Browser (dist/)
  ├─ isHosted() probe → GET /api/config
  ├─ Hosted: load/save via /api/*, no localStorage
  └─ Not hosted: localStorage fallback + warning banner

Express (server/server.js, port 3000, 0.0.0.0)
  ├─ Static: dist/ + SPA fallback
  ├─ /api/config, /api/profiles, /api/projects, /api/projects/:id/assets
  ├─ /api/ha/* → proxy to HA (token server-side only)
  └─ /projects/:id/assets/:type/:assetId/:variant.glb (static)

data/
  ├─ config.json, profiles.json
  └─ projects/<id>/project.json + assets/...
```

## File Changes

### New: Server (7 files)

**`server/package.json`** — Express, multer, http-proxy-middleware deps

**`server/server.js`** — Express entry: static serve `dist/`, mount API routes, serve asset GLBs from `data/`, auto-create `data/` structure on boot, bind `0.0.0.0:${PORT||3000}`

**`server/storage/paths.js`** — Path helpers: `dataDir()`, `configPath()`, `profilesPath()`, `projectDir(id)`, `assetDir(projectId, type, assetId)`

**`server/storage/readWrite.js`** — `readJSON(path)`, `writeJSON(path, data)` (atomic: write `.tmp` then rename), `ensureDir(path)`

**`server/api/config.js`** — `GET /api/config` (mask token → `"***"`), `PUT /api/config` (merge, store token)

**`server/api/profiles.js`** — `GET /api/profiles`, `PUT /api/profiles`

**`server/api/projects.js`** — CRUD: `GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id`, `PUT /api/projects/:id`

**`server/api/assets.js`** — `GET /api/projects/:id/assets`, `GET /api/projects/:id/assets/:assetId`, `POST /api/projects/:id/assets/upload` (multer multipart: fields `type`, `name`, `variant`, `file`; creates folders + `asset.json`)

**`server/api/haProxy.js`** — Proxy `GET/POST/PUT/PATCH/DELETE /api/ha/*` → `${config.ha.baseUrl}/api/*` with stored bearer token. Token never sent to frontend.

### New: Frontend API Adapter

**`src/lib/apiClient.ts`**
- `isHosted()`: probe `GET /api/config` with 2s timeout, cache result
- `fetchConfig()`, `saveConfig()`, `fetchProfiles()`, `saveProfiles()`
- `fetchProjects()`, `saveProject(id, data)`, `uploadAsset(projectId, type, name, variant, file)`
- `haProxyFetch(path, options)` — calls `/api/ha/*`

### Modified: Store — Hosted Mode

**`src/store/useAppStore.ts`**
- Import `apiClient`
- On init: if `isHosted()`, load state from API endpoints, **skip** Zustand `persist` middleware (use a wrapper that conditionally applies `persist` only when not hosted)
- Add `_hostedMode: boolean` flag to state
- Add `syncToServer()`: debounced (500ms) — after state changes, `PUT` profiles/projects to server
- Subscribe to state changes → call `syncToServer()` when hosted

### Modified: HA Connection in Hosted Mode

**`src/components/home/cards/HAConnectionPanel.tsx`**
- When hosted: save HA config via `PUT /api/config` (token goes to server)
- Show masked token from server
- HA WebSocket still connects directly (needed for real-time), but token loaded from server config

**`src/hooks/useHomeAssistant.ts`**
- When hosted: fetch token from `/api/config` (server returns full token for WebSocket init only via a separate secure endpoint or pass through initial config load)

### Modified: Settings UI Layout

**`src/components/home/DashboardGrid.tsx`** — `SettingsCategory`:
- Wrap in `max-w-[1100px] mx-auto`
- Use `grid grid-cols-1 lg:grid-cols-2 gap-4`
- Left: ProfilePanel, CameraStartSettings
- Right: PerformanceSettings, StandbySettingsPanel, LocationSettings, HAConnectionPanel, HomeWidgetConfig

**`src/components/home/cards/ProfilePanel.tsx`**:
- Merge 4 small glass-panels into 2 cards (Profile+Theme+Accent+Background | Data&Backup)
- When hosted: export/import calls server ZIP endpoint
- Tighter spacing

**`src/components/home/cards/HAConnectionPanel.tsx`**:
- Entity list: `max-h-48` with ScrollArea

### Modified: Not-Hosted Banner

**`src/pages/Index.tsx`**
- If `!isHosted()`: show a subtle top banner "⚠ Inte värdläge — data sparas i webbläsaren"

### New: Install/Start Scripts

**`install.bat`** — `cd server && npm ci --omit=dev && cd ..`
**`install.sh`** — same, bash, with `#!/bin/bash`
**`start.bat`** — `node server/server.js`
**`start.sh`** — same, bash

### New: GitHub Release

**`.github/workflows/release.yml`**
- Trigger: `v*` tags
- Steps: checkout → Node 20 → `npm ci` → `npm run build` → package two zips (`bjorq-dashboard-windows.zip`, `bjorq-dashboard-linux.zip`) containing `dist/`, `server/`, `install.*`, `start.*`, `README.md`, `data/.gitkeep`
- Publish via `softprops/action-gh-release`

### New/Updated: Data + Docs

**`data/.gitkeep`** — empty placeholder
**`README.md`** — Rewrite: installation (Windows/Linux), Node.js requirement, autostart hints, architecture, backup strategy

## File Summary

| File | Action |
|------|--------|
| `server/package.json` | New |
| `server/server.js` | New |
| `server/storage/paths.js` | New |
| `server/storage/readWrite.js` | New |
| `server/api/config.js` | New |
| `server/api/profiles.js` | New |
| `server/api/projects.js` | New |
| `server/api/assets.js` | New |
| `server/api/haProxy.js` | New |
| `src/lib/apiClient.ts` | New |
| `src/store/useAppStore.ts` | Modify — hosted mode, conditional persist |
| `src/pages/Index.tsx` | Modify — not-hosted banner |
| `src/components/home/DashboardGrid.tsx` | Modify — 2-col settings grid |
| `src/components/home/cards/ProfilePanel.tsx` | Modify — merged cards, API backup |
| `src/components/home/cards/HAConnectionPanel.tsx` | Modify — proxy mode, compact entities |
| `install.bat` | New |
| `install.sh` | New |
| `start.bat` | New |
| `start.sh` | New |
| `.github/workflows/release.yml` | New |
| `data/.gitkeep` | New |
| `README.md` | Rewrite |

