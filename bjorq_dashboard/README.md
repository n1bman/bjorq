# BJORQ Dashboard - Home Assistant Add-on

A 3D smart home dashboard for wall-mounted tablets and kiosks.

![Version](https://img.shields.io/badge/version-1.8.1-blue)

## Features

- **3D Home View** - Interactive 3D model of your home with live device states
- **Device Control** - Toggle lights, switches, and other devices directly in the 3D scene
- **Build Mode** - Draw walls, import 3D models, place furniture and smart devices
- **Asset Wizard** - Connect to the BJORQ Asset Wizard add-on for a centralized furniture library
- **Climate Engine** - Automatic device control based on sensor thresholds
- **Surveillance** - Live camera snapshots with motion detection
- **Energy Monitoring** - Track power consumption per device
- **Scenes & Automations** - Trigger Home Assistant scenes and automations
- **Standby Mode** - Auto-dimming clock screen with 3D camera preview for wall-mounted displays
- **Unified Dashboard** - Vertical nav rail with drag-to-reorder widget grid and room-based device grouping
- **Hosted Live Sync** - Server-side Home Assistant live sync in add-on and hosted mode with fallback recovery
- **Admin Protection** - Optional admin PIN for protected settings, backup/restore, and Home Assistant actions
- **Kiosk Ready** - Designed for fullscreen tablet and kiosk use

## Installation

1. Go to **Settings -> Add-ons -> Add-on Store -> ... -> Repositories**
2. Add: `https://github.com/n1bman/bjorq`
3. Find and install **BJORQ Dashboard**
4. Start the add-on
5. Open at `http://<HA-IP>:3000`

## Usage

Point any tablet or kiosk browser to `http://<HA-IP>:3000` in fullscreen mode.

### Quick Setup

1. Go to **Inställningar -> Profil** and create an admin PIN if you want protected hosted settings
2. Go to **Inställningar -> Home Assistant** and enter your HA URL + access token
3. Switch to **Build Mode** to import a 3D model or draw your layout
4. Place devices and link them to HA entities
5. Switch back to **Home View** to control your smart home

For a complete walkthrough, see the [Onboarding Guide](../../ONBOARDING.md).

## Data Persistence

All data (config, projects, profiles, backups) is stored in `/data` and persists across restarts and updates.

## Ports

| Port | Description |
|------|-------------|
| 3000 | Dashboard web UI |

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](../../ONBOARDING.md) | Step-by-step onboarding |
| [Overview](../../docs/01-overview.md) | Architecture and platforms |
| [Installation](../../docs/02-installation.md) | Setup for all platforms |
| [Using the Dashboard](../../docs/03-using-the-dashboard.md) | Features and settings |
| [Troubleshooting](../../docs/07-troubleshooting.md) | Common issues and fixes |
| [Patchnotes 1.8.1](../../docs/patchnotes-v1.8.1.md) | Hosted hardening and add-on release notes |

## Support

Report issues at [github.com/n1bman/bjorq/issues](https://github.com/n1bman/bjorq/issues)
