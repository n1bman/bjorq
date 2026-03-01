# Installation

## Requirements

- **Node.js 18+** — download from [nodejs.org](https://nodejs.org/)
- A modern browser (Chrome, Edge, Firefox, or Chromium on Raspberry Pi)

## Windows

1. Download `bjorq-dashboard-windows.zip` from the [latest release](../../releases/latest)
2. Unzip to any folder
3. Double-click **`start.bat`** (or in PowerShell: `.\start.bat`)
4. The browser opens automatically at `http://localhost:3000`

> **First time?** The installer script `install.bat` runs `npm install` in the `server/` folder. This happens automatically via `start.bat` if `node_modules` is missing.

## Linux / Raspberry Pi

1. Download `bjorq-dashboard-linux.zip` from the [latest release](../../releases/latest)
2. Unzip and run:

```bash
chmod +x start.sh install.sh
./start.sh
```

3. Open the address printed in the terminal (e.g. `http://192.168.1.x:3000`)

## Custom Port

By default, BJORQ listens on port **3000**. To change:

```bash
# Linux / macOS
PORT=8080 ./start.sh

# Windows
set PORT=8080
start.bat
```

## Dev Mode

When running `npm run dev` (Vite dev server), the dashboard operates in **DEV mode**:

- Data is stored in the browser's localStorage
- Home Assistant tokens are stored in the browser (not on a server)
- No Express server is needed
- Useful for development and testing

This is also the mode used when previewing the project in cloud-based development environments.

### When to Use Dev Mode

- Developing or testing UI changes
- Trying out the dashboard without setting up a server
- Running in environments where you can't run a Node.js server

## Autostart (Linux systemd)

To run BJORQ automatically on boot:

```ini
# /etc/systemd/system/bjorq-dashboard.service
[Unit]
Description=BJORQ Dashboard
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

## Kiosk Setup

For wall-mounted tablet or kiosk usage, see [Kiosk & Display Modes](./06-kiosk-and-display-modes.md).

## What's Next

- [Using the Dashboard](./03-using-the-dashboard.md) — explore all features
- [Kiosk & Display Modes](./06-kiosk-and-display-modes.md) — set up a wall tablet
- [Data & Backups](./05-data-and-backups.md) — understand where data is stored
