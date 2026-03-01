# bjorQ Dashboard

A 3D smart home dashboard that runs locally alongside Home Assistant. Control lights, climate, vacuums, cameras, and more from a beautiful tablet-friendly interface.

## Quick Start

### Requirements

- **Node.js 18+** (LTS recommended)
- A modern browser (Chrome, Firefox, Edge)

### Installation

1. Download the latest release for your platform from [Releases](../../releases)
2. Extract the ZIP file
3. Open a terminal in the extracted folder

**Windows:**
```bat
install.bat
start.bat
```

**Linux / Raspberry Pi:**
```bash
chmod +x install.sh start.sh
./install.sh
./start.sh
```

4. Open `http://localhost:3000` in your browser

### Custom Port

```bash
PORT=8080 node server/server.js
```

## Architecture

```
bjorq-dashboard/
├── dist/           # Frontend build (served by Express)
├── server/         # Node.js Express host
│   ├── server.js   # Entry point
│   ├── api/        # REST API routes
│   └── storage/    # Disk I/O helpers
├── data/           # Persistent user data (auto-created)
│   ├── config.json
│   ├── profiles.json
│   └── projects/
└── start.sh/.bat   # Launch scripts
```

### Data Persistence

All data is stored on disk in the `data/` folder:

- **config.json** — Global config + Home Assistant connection (token stored securely, never exposed to browser)
- **profiles.json** — UI preferences, theme, performance settings
- **projects/** — Building models, assets, scenes

**Backup:** Copy the entire `data/` folder, or use the in-app export feature.

### Home Assistant Integration

1. Open Settings → Home Assistant in the dashboard
2. Enter your HA URL (e.g., `http://homeassistant.local:8123`)
3. Enter a long-lived access token

The token is stored server-side only. All HA API calls are proxied through the server (`/api/ha/*`), so your token never touches the browser.

### Remote Access

The dashboard binds to `0.0.0.0`, making it accessible from any device on your network. For remote access outside your LAN:

- Use the same reverse proxy / VPN setup you use for Home Assistant
- Or configure HA Cloud / Nabu Casa

## Autostart

### Linux (systemd)

```ini
# /etc/systemd/system/bjorq-dashboard.service
[Unit]
Description=bjorQ Dashboard
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/bjorq-dashboard
ExecStart=/usr/bin/node server/server.js
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable bjorq-dashboard
sudo systemctl start bjorq-dashboard
```

### Windows (Task Scheduler)

1. Open Task Scheduler → Create Basic Task
2. Trigger: "When the computer starts"
3. Action: Start a program → `node.exe` with arguments `server/server.js`
4. Set "Start in" to your bjorQ folder

## Development

```bash
npm install
npm run dev
```

The dev server runs on port 5173 with hot reload. The Node host is only needed for disk persistence and HA proxy features.

### Import Convention

**Always use relative imports** (`./`, `../`) — never `@/` aliases.

This project is developed in Lovable, whose Vite environment does not reliably resolve the `@/` path alias. To prevent "Module failed to load" errors:

- ✅ `import { cn } from "../../lib/utils"`
- ✅ `import { Button } from "./button"`
- ❌ `import { cn } from "@/lib/utils"`

The CI pipeline includes a grep check that blocks PRs containing `@/` imports. The alias config remains in `tsconfig.app.json` and `vite.config.ts` for IDE autocompletion but must not be used in committed code.

## Tech Stack

- React + TypeScript + Vite
- Three.js / React Three Fiber
- Tailwind CSS + shadcn/ui
- Zustand (state management)
- Express (production host)
