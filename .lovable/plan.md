

## Plan: Beta Packaging — GitHub Release + Foolproof Scripts + README

### Phase 1: Release Workflow
The current `.github/workflows/release.yml` looks correctly formatted already. No YAML fix needed — it will work as-is when a `v*` tag is pushed. Both zip artifacts include `dist/`, `server/`, scripts, and `README.md`.

**One improvement**: Both zips currently include the opposite platform's start script. The Windows zip has `install.bat` but not `start.sh`, and vice versa. This is fine. However, we should include **both** start scripts in **both** zips for convenience (some Windows users use WSL). Also add `server/package.json` and `server/package-lock.json` explicitly (they're already included via `cp -r server`).

No changes needed to `release.yml` — it's valid YAML and functional.

### Phase 2: Foolproof Start Scripts

**`start.bat` (Windows)**
- Check `node --version`, if fails print "Node.js not found" + download link and exit
- If `server\node_modules` doesn't exist, auto-run `npm ci --omit=dev` in `server/`
- Start `node server/server.js`
- Print URL and data path

**`start.sh` (Linux)**
- Same: node check, auto-install, start, print info
- Already set executable in release workflow (`chmod +x`)

**`install.bat` / `install.sh`** — Keep as-is (they still work standalone), but now they're optional since start scripts auto-install.

### Phase 3: README Rewrite
Complete rewrite focused on beta download-and-run:
- Quick Start: Download → Extract → Run
- Windows steps, Linux steps
- Requirements (Node 18+)
- Port config (`PORT=8080`)
- Data location (`data/` folder)
- Troubleshooting section (Node not found, port in use, permission denied)
- Remove dev-focused content from top (move to bottom "Development" section)

### Phase 4: Package.json Metadata
- `"name": "bjorq-dashboard"`
- `"version": "0.1.0"`
Only these two fields change.

### Phase 5: Dry Run
Cannot create tags from here — you'll push a tag `v0.1.0` after merging. I'll provide a checklist.

### Files modified (5)
- `start.bat` — node check, auto-install, info output
- `start.sh` — node check, auto-install, info output
- `README.md` — beta-focused rewrite
- `package.json` — name + version metadata
- `.github/workflows/release.yml` — minor: include both scripts in both zips for robustness

