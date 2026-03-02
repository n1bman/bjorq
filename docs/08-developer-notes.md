# Developer Notes

This document covers the technical architecture for contributors and developers.

## Folder Structure

```
bjorq-dashboard/
├── src/                    # Frontend source (React + TypeScript)
│   ├── components/
│   │   ├── build/          # Build mode (walls, import, furnish, devices)
│   │   ├── home/           # Home view (dashboard, widgets, settings)
│   │   ├── standby/        # Standby/screensaver mode
│   │   ├── devices/        # Device markers and overlays
│   │   └── ui/             # shadcn/ui components
│   ├── hooks/              # Custom React hooks (HA, weather, theme)
│   ├── lib/                # Utilities (apiClient, materials, demo data)
│   ├── store/              # Zustand store (types.ts, useAppStore.ts)
│   ├── pages/              # Route pages (Index, NotFound)
│   └── test/               # Test setup and test files
├── server/                 # Express server (Node.js)
│   ├── server.js           # Entry point, middleware, SPA fallback
│   ├── api/                # Route handlers
│   │   ├── bootstrap.js    # GET /api/bootstrap (all data in one call)
│   │   ├── config.js       # GET/PUT /api/config
│   │   ├── profiles.js     # GET/PUT /api/profiles
│   │   ├── projects.js     # GET/PUT /api/projects/:id
│   │   ├── assets.js       # POST /api/projects/:id/assets/upload
│   │   ├── haProxy.js      # ALL /api/ha/* (proxy to Home Assistant)
│   │   └── backups.js      # POST /api/backup
│   ├── storage/
│   │   ├── paths.js        # Path constants (data/, config.json, etc.)
│   │   └── readWrite.js    # Atomic read/write with tmp+rename
│   └── package.json        # Server dependencies (express, multer)
├── data/                   # Runtime data (created on first boot)
├── public/                 # Static assets (favicon, manifest, logos)
├── docs/                   # Documentation (this handbook)
├── .github/workflows/      # CI and release automation
├── dist/                   # Production build output (gitignored)
├── start.bat / start.sh    # Launch scripts
└── install.bat / install.sh # Dependency installation scripts
```

## API Endpoints

All endpoints are prefixed with `/api`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/bootstrap` | Returns config (masked token), profiles, all projects, and active project ID in a single response |
| `GET` | `/api/config` | Read config (HA token is masked as `***`) |
| `PUT` | `/api/config` | Update config (deep-merges `ha`, `ui`, `network` sections) |
| `GET` | `/api/profiles` | Read user profiles |
| `PUT` | `/api/profiles` | Update profiles |
| `GET` | `/api/projects` | List all projects |
| `GET` | `/api/projects/:id` | Read a single project |
| `PUT` | `/api/projects/:id` | Update a project (creates if missing) |
| `POST` | `/api/projects/:id/assets/upload` | Upload a GLB/GLTF asset (multipart form) |
| `POST` | `/api/backup` | Create a server-side backup in `data/backups/` |
| `ALL` | `/api/ha/*` | Proxy to Home Assistant API (attaches Bearer token from config) |

### HA Proxy Details

The `/api/ha/*` route:
1. Reads the HA base URL and token from `data/config.json`
2. Strips the `/api/ha/` prefix
3. Forwards the request to `{baseUrl}/api/{path}` with the Bearer token
4. Returns the response to the browser

The token **never** reaches the browser. The `GET /api/config` endpoint always masks it.

## Mode Resolution

The frontend determines its operating mode in `src/lib/apiClient.ts`:

```
1. VITE_FORCE_DEV=1 → DEV (skip probe)
2. VITE_FORCE_HOSTED=1 → HOSTED (skip probe)
3. import.meta.env.DEV === true → DEV (Vite dev mode, no probe)
4. Production build → probe GET /api/config with 1000ms timeout
   → 200 OK = HOSTED
   → timeout/error = DEV
```

In HOSTED mode, the frontend fetches all data from the server API. In DEV mode, it uses Zustand's `persist` middleware with localStorage.

## State Management

The app uses a single Zustand store (`src/store/useAppStore.ts`) with the following top-level slices:

- **layout** — Floors, walls, rooms, stairs, scale calibration
- **build** — Active tool, tab, grid settings, selection, undo/redo stacks
- **homeGeometry** — Imported model settings (URL, position, scale, floor bands, opacity)
- **devices** — Device markers and their live states
- **props** — Furniture catalog and placed items
- **environment** — Weather, sun position, location, time mode
- **homeAssistant** — HA connection status, entities, config
- **performance** — Quality, shadows, postprocessing, tablet mode
- **profile** — User name, theme, accent color
- **standby** — Idle timeout, camera view
- **homeView** — Camera preset, visible widgets, home screen devices
- **comfort** — Climate rules, comfort engine state, override timer
- **vacuumDebug** — Debug overlay toggle and live telemetry data

## Import Conventions

**Always use relative imports** (`./`, `../`). Never use the `@/` alias. This ensures compatibility across all build environments.

```typescript
// ✅ Correct
import { useAppStore } from '../../store/useAppStore';

// ❌ Wrong
import { useAppStore } from '@/store/useAppStore';
```

## Build & Release

### Development

```bash
npm install
npm run dev     # Vite dev server at :5173
```

### Production Build

```bash
npm run build   # Outputs to dist/
```

### Release Workflow

Releases are automated via GitHub Actions (`.github/workflows/release.yml`):

1. Update `CHANGELOG.md` with all changes under a new version heading
2. Bump `version` in `package.json` (the UI reads this automatically via `__APP_VERSION__`)
3. Commit and push
4. Push a version tag: `git tag v0.2.1 && git push --tags`
5. The workflow:
   - Checks out code
   - Installs dependencies (`npm install`)
   - Builds the frontend (`npm run build`)
   - Packages two ZIP artifacts:
     - `bjorq-dashboard-windows.zip`
     - `bjorq-dashboard-linux.zip`
   - Creates a GitHub Release with the ZIPs and auto-generated release notes

Each ZIP contains: `dist/`, `server/`, `start.bat`, `start.sh`, `install.bat`, `install.sh`, `README.md`, and an empty `data/` folder.

> **Important:** Always bump `package.json` version and update `CHANGELOG.md` before tagging a release. The version shown in the UI is injected at build time from `package.json`.

### CI

The CI workflow (`.github/workflows/ci.yml`) runs on every push and PR:
- Lints the codebase
- Runs tests (`vitest run`)
- Builds the frontend

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 |
| Language | TypeScript |
| Bundler | Vite 5 |
| 3D Engine | Three.js + React Three Fiber + Drei |
| State | Zustand |
| Styling | Tailwind CSS + shadcn/ui |
| Server | Express (Node.js 18+) |
| File Upload | Multer |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
