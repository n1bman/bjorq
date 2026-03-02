

## Plan: BJORQ Dashboard as Home Assistant Add-on — v0.2.3

No UI changes. Distribution and infrastructure only.

### Phase 1: Add-on repo structure (4 new files)

**`repository.yaml`** (repo root)
```yaml
name: "BJORQ Add-ons"
url: "https://github.com/n1bman/bjorq"
maintainer: "n1bman"
```

**`bjorq_dashboard/config.yaml`**
- `name`, `slug`, `version: "0.2.3"`, `description`, `url`
- `startup: services`, `boot: auto`, `init: false`
- `arch: [amd64, aarch64, armv7]`
- `ports: { "3000/tcp": 3000 }`, `ports_description`
- `webui: "http://[HOST]:[PORT:3000]"`
- `image: "ghcr.io/n1bman/bjorq-dashboard-{arch}"` (prebuilt images)

**`bjorq_dashboard/Dockerfile`** (multi-stage)
```text
Stage 1 (build): node:20-alpine
  - COPY package*.json → npm ci
  - COPY src/, index.html, vite.config.ts, etc. → npm run build
  - Result: dist/

Stage 2 (runtime): node:20-alpine
  - COPY dist/ from stage 1
  - COPY server/ → cd server && npm install --omit=dev
  - ENV PORT=3000 BJORQ_DATA_DIR=/data
  - CMD ["node", "server/server.js"]
```

**`bjorq_dashboard/run.sh`**
```bash
#!/usr/bin/with-contenv bashio
export PORT=3000
export BJORQ_DATA_DIR=/data
bashio::log.info "Starting BJORQ Dashboard on :3000"
bashio::log.info "Data dir: /data"
exec node /app/server/server.js
```

**`bjorq_dashboard/README.md`** — short install instructions for the add-on store page.

### Phase 2: Make data dir configurable (1 file change)

**`server/storage/paths.js`** — line 7:
```javascript
// Before
export const dataDir = () => path.join(ROOT, 'data');

// After
export const dataDir = () => process.env.BJORQ_DATA_DIR || path.join(ROOT, 'data');
```

This is the only server change. Everything else (config.json, profiles.json, projects/) derives from `dataDir()`, so it all follows automatically. Normal dev/zip installs are unaffected (env var not set = same behavior).

### Phase 3: GHCR build workflow (1 new file)

**`.github/workflows/ha-addon-build.yml`**
- Triggers on `v*` tags and `workflow_dispatch`
- Uses `ghcr.io/home-assistant/amd64-base-debian` or the official `home-assistant/builder` action
- Builds multi-arch (amd64, aarch64, armv7) from `bjorq_dashboard/Dockerfile`
- Pushes to `ghcr.io/n1bman/bjorq-dashboard-{arch}`
- Requires `packages: write` permission

### Phase 4: README + Changelog + Version bump (3 files)

**`README.md`** — add a "Home Assistant Add-on" section after Quick Start:
```markdown
## Home Assistant Add-on

1. Go to **Settings → Add-ons → Add-on Store → ⋮ → Repositories**
2. Add: `https://github.com/n1bman/bjorq`
3. Install **BJORQ Dashboard**
4. Start → Open at `http://<HA-IP>:3000`

Tablet/kiosk: point the browser to the same URL in fullscreen mode.
```

**`CHANGELOG.md`** — add v0.2.3 entry with add-on distribution additions.

**`package.json`** — bump to `0.2.3`.

### Files Summary (8 files)

| File | Action |
|------|--------|
| `repository.yaml` | Create |
| `bjorq_dashboard/config.yaml` | Create |
| `bjorq_dashboard/Dockerfile` | Create |
| `bjorq_dashboard/run.sh` | Create |
| `bjorq_dashboard/README.md` | Create |
| `.github/workflows/ha-addon-build.yml` | Create |
| `server/storage/paths.js` | Edit line 7 (env var fallback) |
| `README.md` | Add HA section |
| `CHANGELOG.md` | Add v0.2.3 |
| `package.json` | Bump version |

