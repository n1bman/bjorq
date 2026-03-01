# bjorQ Dashboard

A 3D smart home dashboard that runs locally alongside Home Assistant. Control lights, climate, vacuums, cameras, and more from a beautiful tablet-friendly interface.

## Quick Start

### Requirements

- **Node.js 18+** — [Download here](https://nodejs.org/) (LTS recommended)

### Windows

1. Download `bjorq-dashboard-windows.zip` from [Releases](../../releases/latest)
2. Extract the ZIP
3. Double-click **`start.bat`**
4. Open **http://localhost:3000**

### Linux / Raspberry Pi

1. Download `bjorq-dashboard-linux.zip` from [Releases](../../releases/latest)
2. Extract and open a terminal in the folder:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
3. Open **http://localhost:3000**

> The start scripts automatically install server dependencies on first run — no separate install step needed.

### Custom Port

```bash
# Linux / macOS
PORT=8080 ./start.sh

# Windows (Command Prompt)
set PORT=8080
start.bat
```

## Data & Persistence

All user data is stored in the `data/` folder next to the server:

| File | Content |
|------|---------|
| `data/config.json` | HA connection, UI defaults |
| `data/profiles.json` | Theme, performance, standby settings |
| `data/projects/` | Building models, assets, scenes |

**Backup:** Copy the entire `data/` folder.

## Home Assistant Integration

1. Open **Settings → Home Assistant** in the dashboard
2. Enter your HA URL (e.g. `http://homeassistant.local:8123`)
3. Enter a [long-lived access token](https://developers.home-assistant.io/docs/auth_api/#long-lived-access-tokens)

Your token is stored server-side only. All HA API calls are proxied through `/api/ha/*` — the token never reaches the browser.

## Network Access

The server binds to `0.0.0.0`, so any device on your LAN can reach it. For remote access, use the same reverse proxy or VPN you use for Home Assistant.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Node.js not found"** | Install Node.js 18+ from [nodejs.org](https://nodejs.org/) |
| **"Port in use"** | Set a different port: `PORT=8080 ./start.sh` |
| **"Permission denied" (Linux)** | Run `chmod +x start.sh` first |
| **Blank page after start** | Wait a few seconds, then hard-refresh (`Ctrl+Shift+R`) |

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

---

## Development

```bash
npm install
npm run dev
```

The dev server runs on port 5173 with hot reload. The Node host is only needed for disk persistence and HA proxy features.

### Import Convention

**Always use relative imports** (`./`, `../`) — never `@/` aliases. See CI check in `.github/workflows/ci.yml`.

## Tech Stack

React · TypeScript · Vite · Three.js / React Three Fiber · Tailwind CSS · shadcn/ui · Zustand · Express
