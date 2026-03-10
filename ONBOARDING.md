# Getting Started with BJORQ Dashboard

A step-by-step guide to set up your 3D smart home dashboard.

---

## Step 1: Install & Launch

Choose your platform:

- **Windows** — Download `bjorq-dashboard-windows.zip` from [Releases](../../releases/latest), unzip, double-click `start.bat`
- **Linux / Raspberry Pi** — Download `bjorq-dashboard-linux.zip`, unzip, run `chmod +x start.sh && ./start.sh`
- **Home Assistant Add-on** — Add `https://github.com/n1bman/bjorq` as a repository in **Settings → Add-ons → Add-on Store → ⋮ → Repositories**, then install **BJORQ Dashboard**

The dashboard opens at `http://localhost:3000` (or `http://<HA-IP>:3000` for add-on installs).

> 📖 Detailed instructions: [Installation Guide](docs/02-installation.md)

---

## Step 2: Connect Home Assistant

1. Open the dashboard and go to **Inställningar → Home Assistant**
2. Enter your HA URL (e.g. `http://homeassistant.local:8123`)
3. Paste a **Long-Lived Access Token** (create one in HA: Profile → Security → Long-Lived Access Tokens)
4. Click **Testa anslutning** — a green checkmark confirms the connection

Your devices, automations, and scenes will now sync automatically.

---

## Step 3: Build Your Home

Switch to **Build Mode** using the bottom navigation bar. You have two options:

### Option A: Import a 3D Model

1. Go to **Importera** tab
2. Upload a `.glb` or `.gltf` file of your home
3. Adjust position, rotation, and scale to align with the grid
4. Set ground level and north angle for accurate sun simulation

### Option B: Draw from Scratch

1. Go to **Struktur** tab
2. Use **Väggar** to draw walls (click to place points, walls snap to grid)
3. Define **Rum** by selecting bounding walls
4. Add **Dörrar & Fönster** to walls
5. Use **Mallar** for quick-start room templates (bathroom, kitchen, etc.)

> 📖 Details: [Using the Dashboard — Build Mode](docs/03-using-the-dashboard.md#build-mode)

---

## Step 4: Place Devices

1. Stay in **Build Mode**, switch to the **Enheter** tab
2. Select a device type (light, sensor, climate, camera, etc.)
3. Click in the 3D view to place it
4. In the inspector panel, link each device to a **Home Assistant entity**
5. Devices are automatically assigned to rooms based on their 3D position

> 💡 Set **estimated wattage** per device for energy monitoring in the Energy tab.

---

## Step 5: Furnish (Optional)

1. Switch to the **Möblera** tab in Build Mode
2. Browse the built-in prop catalog or connect the **BJORQ Asset Wizard** add-on for more models
3. Place furniture with drag-and-drop, adjust position/rotation/scale

### Asset Wizard Integration

If you have the BJORQ Asset Wizard add-on installed:
1. Go to **Inställningar → Wizard**
2. Enter the Wizard URL (default: `http://<ha-ip>:3500`)
3. Test the connection
4. Browse Wizard assets directly in the Furnish tab

> 📖 Details: [Using the Dashboard — Furnish](docs/03-using-the-dashboard.md#furnish-möblera)

---

## Step 6: Use the Dashboard

Switch back to **Home View** — your daily control center:

- **3D View** — See your home with live device states (lights glow, sensors pulse)
- **Widgets** — Clock, weather, temperature, energy, calendar floating on screen
- **Categories** — Tap the category bar: Hem, Väder, Enheter, Energi, Automatiseringar, Scener, Klimat, and more
- **Room Navigator** — Tap the door icon to fly to specific rooms and control their devices

> 📖 Details: [Using the Dashboard — Home View](docs/03-using-the-dashboard.md#home-view)

---

## Step 7: Kiosk Setup (Optional)

For wall-mounted tablets:

1. Go to **Inställningar → Skärm** for fullscreen and kiosk instructions
2. Enable **Standby** mode in **Inställningar → Standby** (auto-dims after idle)
3. Consider enabling **Surfplatteläge** in **Inställningar → Grafik & Miljö** for slower devices

Point any browser to `http://<dashboard-ip>:3000` in fullscreen mode.

> 📖 Details: [Kiosk & Display Modes](docs/06-kiosk-and-display-modes.md)

---

## Tips & Next Steps

- Load the **demo project** from **Inställningar → Data & Backup** for a quick starting point
- Use **Scenes** to save device states and trigger them with one tap
- Set up **Climate rules** to automate devices based on sensor thresholds
- Enable **Surveillance** for live camera snapshots with motion detection
- Back up regularly via **Inställningar → Data & Backup → Spara & Backup**

---

## Documentation

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
