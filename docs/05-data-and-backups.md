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
        ├── project.json # Layout, devices, props, environment, geometry
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
| `projects/<id>/project.json` | Complete project state: layout (walls, rooms, floors), devices, props, environment, imported model settings |

## Backups

### Creating a Backup

Go to **Inställningar → Data & Backup** and tap **Spara & Backup**. This does two things:

1. **Browser download** — saves a JSON file to your device
2. **Server backup** (HOSTED mode only) — saves a copy to `data/backups/` on the server

### Restoring a Backup

Use the **import** function in Data & Backup to load a previously exported JSON file. This replaces all current settings and project data.

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
