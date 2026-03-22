# Data & Backups

## Data Storage Modes

BJORQ uses different storage depending on the operating mode:

### HOSTED Mode (Production)

When running via `start.sh` / `start.bat`, all data is stored on **disk** in the `data/` folder next to the server:

```
data/
├── config.json          # HA connection, UI settings, network config
├── profiles.json        # Theme, performance, standby, home view settings
├── backups/             # Server-side backup snapshots
│   └── bjorq-backup-2025-01-15T14-30-00.json
└── projects/
    └── home/
        ├── project.json # Layout, devices, props, terrain, environment, geometry
        └── assets/      # Uploaded GLB models, textures
            └── home-model/
                └── files/
                    └── model.glb
```

**Atomic writes:** The server writes to a temporary `.tmp` file first, then renames it to the final path. This prevents data corruption if the server crashes or loses power mid-write.

**localStorage is disabled** in HOSTED mode to avoid inconsistent state between disk and browser.

### DEV Mode (Development)

When running `npm run dev` or in a preview environment:

- Data is stored in the browser's **localStorage** via Zustand's persist middleware
- Each browser/profile has its own independent data
- Data is lost if you clear browser data

## Data Files

| File | Contents |
|------|----------|
| `config.json` | Home Assistant URL and access token (token stored server-side only), default project ID, UI preferences, network port |
| `profiles.json` | User profile (name, theme, accent color), performance settings, standby config, home view widget visibility, camera presets |
| `projects/<id>/project.json` | Complete project state: layout (walls, rooms, floors), devices, props, terrain, imported model settings |

## Build Project Persistence

### What is saved

The **Build Project** contains all data related to your built home:

| Data | Description |
|------|-------------|
| Layout | Floors, walls, rooms, stairs, openings, vacuum mapping, reference drawings |
| Devices | All placed device markers and their states |
| Home Geometry | Imported 3D model settings (position, rotation, scale, floor bands) |
| Props | Furniture catalog and placed items |
| Terrain | Grass, trees, ground environment |
| Activity Log | Device state changes and alerts |

### Autosave

Build changes are automatically saved:
- **HOSTED mode**: debounced sync to server (1 second after last change)
- **DEV mode**: automatic via Zustand persist to localStorage

### Manual Save

Use the **Spara projekt** button in **Inställningar → Data → Projekthantering** to force an immediate save.

## Build Project Export & Import

### Exporting a Project

Go to **Inställningar → Data → Projekthantering** and tap **Exportera projekt (.json)**.

This creates a portable `.json` file containing:
- Full layout (walls, rooms, doors, windows, stairs, floors)
- All device markers and states
- Props and furniture
- Terrain settings
- Schema version for future compatibility

The exported file can be moved to another device or BJORQ installation.

### Importing a Project

1. Go to **Inställningar → Data → Projekthantering**
2. Tap **Importera projekt**
3. Select a `.json` project file
4. Review the import preview (floors, rooms, devices, warnings)
5. Confirm to replace the current project

Import features:
- **Schema validation** — rejects corrupt or invalid files
- **Version migration** — automatically upgrades older project formats
- **Preview dialog** — shows project stats before applying
- **Warning system** — alerts about missing data or format changes

### Moving Projects Between Devices

1. **Export** on the source device (Exportera projekt)
2. Transfer the `.json` file (USB, email, cloud storage, etc.)
3. **Import** on the target device (Importera projekt)

The project file is self-contained — no additional files needed unless you use custom GLB models (those must be re-uploaded separately).

## Project Schema Versioning

Exported project files include a `schemaVersion` field. When importing an older file:
- BJORQ automatically applies migrations to bring the data to the current format
- A warning toast shows which migrations were applied
- Original data is never modified — only the in-memory copy is migrated

Current schema version: **1**

## Full App Backups

### Creating a Backup

Go to **Inställningar → Data & Backup** and tap **Spara & Backup**. This does two things:

1. **Browser download** — saves a JSON file to your device (includes ALL app state)
2. **Server backup** (HOSTED mode only) — saves a copy to `data/backups/` on the server

### Restoring a Backup

Use the **Importera backup** function in Data & Backup to load a previously exported JSON file. In HOSTED mode the restore is written back through the server data layer, so settings and project data remain after restart.

> **Note:** Full app backups include profile, HA connection, and all settings. For project-only portability, use **Exportera projekt** instead.

### Manual Backup

You can also manually copy the entire `data/` folder for a complete backup:

```bash
cp -r data/ data-backup-$(date +%Y%m%d)/
```

## Clearing Data

The **Rensa all data** button in Data & Backup resets everything:
- In HOSTED mode: clears server-side data files
- In DEV mode: clears localStorage

⚠️ This action cannot be undone. Create a backup first.

## Demo Project

If you're new to BJORQ, tap **Ladda demo-projekt** in Data & Backup. This creates a sample house layout with rooms and device markers so you can explore the UI without building from scratch.
