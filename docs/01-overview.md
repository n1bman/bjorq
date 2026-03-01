# BJORQ Dashboard — Overview

BJORQ Dashboard is a 3D smart home control panel designed for wall-mounted tablets, kiosks, and desktop browsers. It renders a live 3D model of your home where you can place device markers, control lights, cameras, climate systems, and more — all connected to [Home Assistant](https://www.home-assistant.io/).

## Target Use Case

- **Wall tablet** in your hallway or kitchen showing a live 3D view of your home
- **Kiosk mode** on a Raspberry Pi or mini-PC connected to a touchscreen
- **Desktop browser** for building and configuring your smart home layout

## Architecture

```
┌──────────────────────────────────┐
│         Browser (Frontend)       │
│  React · Three.js · Zustand     │
│  Vite dev server (port 5173)    │
└──────────┬───────────────────────┘
           │ HTTP / REST
┌──────────▼───────────────────────┐
│       Node.js Server (Express)   │
│  Serves built frontend (dist/)   │
│  REST API for config/projects    │
│  HA proxy (/api/ha/*)            │
│  Data persistence (data/)        │
└──────────┬───────────────────────┘
           │ HTTP + Bearer token
┌──────────▼───────────────────────┐
│       Home Assistant Instance    │
│  Entity states, services, WS    │
└──────────────────────────────────┘
```

### Frontend

Built with **Vite + React + TypeScript**. The 3D scene uses **React Three Fiber** (Three.js) with support for imported GLTF/GLB models, procedural walls and rooms, device markers, weather effects, and dynamic lighting. State management is handled by **Zustand**.

### Server

A lightweight **Express** server that:

- Serves the production build (`dist/`)
- Provides REST endpoints for configuration, profiles, and project data
- Proxies all Home Assistant API calls so the HA access token **never reaches the browser**
- Persists data to disk in the `data/` folder using atomic writes

### Home Assistant Integration

All communication with Home Assistant goes through the server-side proxy (`/api/ha/*`). The long-lived access token is stored only on the server in `data/config.json`. The browser never sees or handles the token directly.

## Dual-Mode System

BJORQ Dashboard operates in one of two modes:

| Mode | When | Data Storage | HA Connection |
|------|------|-------------|---------------|
| **HOSTED** | Running via `start.sh` / `start.bat` with the Node server | Disk (`data/` folder) | Server-side proxy |
| **DEV** | Running `npm run dev` or in a preview environment | Browser localStorage | Direct (token in browser) |

Mode is detected automatically at startup. In production builds, the frontend probes `GET /api/bootstrap` — if it responds, HOSTED mode activates. In Vite dev mode, DEV is assumed by default.

You can force a mode with environment variables:
- `VITE_FORCE_DEV=1` — always use DEV mode
- `VITE_FORCE_HOSTED=1` — always use HOSTED mode

## Supported Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| **Windows 10/11** | ✅ Full support | Use `start.bat` or PowerShell |
| **Linux (x64)** | ✅ Full support | Use `start.sh` |
| **Raspberry Pi (arm64)** | ✅ Full support | Recommended: Pi 4+ with 4 GB RAM |
| **macOS** | ✅ Works | Use `start.sh` |

**Requirements:** Node.js 18 or newer.

## What's Next

- [Installation Guide](./02-installation.md) — get BJORQ running in minutes
- [Using the Dashboard](./03-using-the-dashboard.md) — explore all features
- [Troubleshooting](./07-troubleshooting.md) — common issues and solutions
