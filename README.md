# BJORQ Dashboard

A 3D smart home dashboard for wall-mounted tablets and kiosks, powered by Home Assistant.

![Version](https://img.shields.io/badge/version-0.2.2-blue)

## Quick Start

**Requires:** Node.js 18+ — [nodejs.org](https://nodejs.org/)

### Windows

1. Download `bjorq-dashboard-windows.zip` from [Releases](../../releases/latest)
2. Unzip and double-click **`start.bat`**
3. Opens at `http://localhost:3000`

### Linux / Raspberry Pi

1. Download `bjorq-dashboard-linux.zip` from [Releases](../../releases/latest)
2. Unzip and run:
   ```bash
   chmod +x start.sh && ./start.sh
   ```
3. Open the address printed in the terminal

## Documentation

Full handbook available in [`/docs`](./docs/):

| Guide | Description |
|-------|-------------|
| [Overview](docs/01-overview.md) | Architecture, modes, supported platforms |
| [Installation](docs/02-installation.md) | Setup for Windows, Linux, Raspberry Pi |
| [Using the Dashboard](docs/03-using-the-dashboard.md) | Features, Build Mode, Settings |
| [Performance & 3D](docs/04-performance-and-3d.md) | Quality settings, optimization tips |
| [Data & Backups](docs/05-data-and-backups.md) | Storage, backup, restore |
| [Kiosk & Display](docs/06-kiosk-and-display-modes.md) | App mode, kiosk setup |
| [Troubleshooting](docs/07-troubleshooting.md) | Common issues and fixes |
| [Developer Notes](docs/08-developer-notes.md) | API, state, build system |

## Development

```bash
npm install
npm run dev
```

**Import convention:** Always use relative imports (`./`, `../`) — never `@/`.

## Tech Stack

React · TypeScript · Vite · Three.js · Tailwind CSS · shadcn/ui · Zustand · Express

## License

MIT
