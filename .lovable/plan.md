

## Plan: Create Official Documentation & User Handbook

Create 8 structured markdown files in `/docs/` plus update the root `README.md`. All content based on the actual codebase architecture, features, and current v0.1.8 state.

### Files to Create/Modify (9 total)

**1. `docs/01-overview.md`** — What BJORQ Dashboard is, target use case (wall tablet / kiosk smart home), architecture diagram (Vite+React frontend, Express server, HA integration), dual-mode system (HOSTED vs DEV), supported platforms.

**2. `docs/02-installation.md`** — Windows (start.bat, PowerShell note), Linux/RPi (start.sh, chmod), Node 18+ requirement, custom PORT, dev mode explanation (Lovable preview = DEV, token in browser). Reference kiosk.bat/app-mode from Display settings.

**3. `docs/03-using-the-dashboard.md`** — Walk through all DashboardGrid categories: Home (widgets, categories, device cards), Weather, Calendar, Devices (filter by kind), Energy (manual watt estimates + HA live), Automations, Scenes, Surveillance, Robot, Activity, Settings (Profile, Performance, Standby, Display/Kiosk, HA Connection, Location, WiFi, Widgets). Also cover Build Mode tabs: Structure (walls, rooms, templates), Import (3D model, floor bands, opacity), Furnish (props catalog), Devices (place markers, light types, HA entity binding).

**4. `docs/04-performance-and-3d.md`** — Quality levels (low/medium/high → DPR, shadow maps, antialias), shadows toggle, postprocessing, tablet mode override, Canvas remount on settings change, performance score (0-100), hardware detection (hardwareConcurrency), WebGL context loss recovery, model stats (triangles/materials/textures rating), tips for optimization.

**5. `docs/05-data-and-backups.md`** — HOSTED: disk persistence in `data/` (config.json, profiles.json, projects/), atomic writes via tmp+rename. DEV: Zustand persist to localStorage. Backup system: "Spara & Backup" button → browser download + server POST to `data/backups/`. Manual export/import. Clear all data option. Folder structure table.

**6. `docs/06-kiosk-and-display-modes.md`** — App Mode (Chrome/Edge `--app` flag with examples), Browser Fullscreen (in-app toggle, auto-fullscreen option), OS Kiosk (info-only: Windows kiosk, Linux `--kiosk`), how to exit each mode (ESC, Alt+F4), admin unlock (5s long-press on nav bar), autostart suggestions (systemd unit example from README).

**7. `docs/07-troubleshooting.md`** — Practical table: server not starting, port in use, Node not found, HA not connecting (token/URL issues, proxy vs direct), 3D model not loading (timeout, retry), WebGL context lost (auto-recovery), black screen (hard reload), permissions (chmod), blank page (wait + Ctrl+Shift+R), performance issues (lower quality).

**8. `docs/08-developer-notes.md`** — Folder structure (src/, server/, data/, public/, docs/), API endpoints (GET/PUT /api/config, /api/profiles, /api/projects, POST /api/backup, /api/ha/* proxy), mode resolution flow (apiClient.ts probe logic), state management (Zustand store structure from types.ts), build/release workflow (GitHub Actions, v* tags, ZIP artifacts), import conventions (relative only, no @/), CI checks.

**9. `README.md`** — Rewrite to be short and professional: one-liner description, Quick Start (Windows + Linux, 3 steps each), link to `/docs/` for full handbook, current version (v0.1.8), tech stack one-liner, license placeholder. No mention of "Lovable".

### Writing Approach
- Product handbook tone, not developer notes (except 08)
- Swedish UI labels referenced as-is (e.g., "Inställningar → Prestanda")
- English documentation text
- No mention of "Lovable" anywhere
- Consistent heading structure (H1 = title, H2 = sections, H3 = subsections)

### No Code Changes
Pure documentation — no functional changes to the application.

