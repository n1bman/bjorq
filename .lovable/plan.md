

# Build Project Persistence System — Analysis & Plan

## Current State Analysis

### What IS persisted today

**Project data** (synced to server via `syncProjectToServer()`, or localStorage via zustand persist):
- `layout` — floors, walls, rooms, stairs, openings, vacuum mapping, reference drawings
- `devices` — markers, deviceStates, vacuumDebug
- `homeGeometry` — imported model settings (URL, position, rotation, scale, floor bands, north angle)
- `props` — catalog + placed items
- `activityLog`

**Profile data** (separate sync via `syncProfileToServer()`):
- `profile`, `performance`, `standby`, `homeView`, `environment`, `customCategories`, `wifi`, `energyConfig`, `calendar`, `automations`, `savedScenes`

### What is NOT persisted
- `terrain` (TerrainSettings — grass, trees) — defined in state but NOT in either sync function
- `comfort` (ComfortState — comfort rules) — same, never synced
- No materials catalog in state (materials are static constants in `src/lib/materials.ts`)

### What is missing for a proper Build Project system
1. **No schema version** — no way to detect or migrate older project files
2. **No dedicated project export** — DataBackupCard dumps the entire app state, mixing project data with profile/HA settings
3. **No import validation** — import just does `setState(JSON.parse(...))`
4. **No multi-project support in UI** — server has `/api/projects` CRUD but the frontend hardcodes `_activeProjectId = 'home'`
5. **No migration system** for evolving schemas
6. **terrain and comfort data silently lost** on server restarts in hosted mode

---

## Implementation Plan

### Phase 1 — Define Build Project schema + fix missing persistence

**`src/store/types.ts`** — add `BuildProject` interface:
```typescript
interface BuildProject {
  schemaVersion: number; // starts at 1
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  layout: LayoutState;
  devices: DevicesState;
  homeGeometry: HomeGeometryState;
  props: PropsState;
  terrain: TerrainSettings;
  activityLog: ActivityEvent[];
  // Room-linked metadata carried by rooms/scenes/automations
}
```

**`src/store/useAppStore.ts`** — add `terrain` and `comfort` to `syncProjectToServer()` so they're not lost.

### Phase 2 — Autosave + manual save reliability

Already working via zustand persist (DEV) and `syncProjectToServer` subscriber (HOSTED). Changes needed:
- Add `terrain` to project sync payload
- Add visual save indicator (small "Saved" / "Saving..." badge in Build mode toolbar)
- Add explicit "Save now" button that forces immediate sync (bypasses debounce)

**Files**: `src/store/useAppStore.ts`, `src/components/build/BuildTopToolbar.tsx`

### Phase 3 — Dedicated Build Project Export

**`src/lib/projectIO.ts`** (new) — export/import utilities:
- `exportBuildProject()`: extracts project-only data from store, wraps in `BuildProject` envelope with `schemaVersion`, metadata, timestamp
- Produces a `.bjorq.json` file (or just `.json` with structured content)
- Strips transient state (vacuumDebug, undo/redo stacks)
- Handles GLB model: if `fileData` exists, includes it; otherwise notes the URL

**`src/components/build/BuildTopToolbar.tsx`** or a new **ProjectMenu** — add "Export project" action.

### Phase 4 — Build Project Import with validation

**`src/lib/projectIO.ts`** — add:
- `importBuildProject(json)`: validates schema version, checks required fields
- `validateProjectSchema(data)`: returns `{ valid, errors, warnings }`
- `migrateProject(data, fromVersion)`: applies migrations sequentially
- Import options: "Replace current" or "Import as new project"
- Defensive field merging (missing fields get defaults, extra fields preserved)

**UI**: Import button in Build toolbar or Settings, with a confirmation dialog showing project name, stats (rooms, devices, floors), and any migration warnings.

### Phase 5 — Project Management UI

**`src/components/home/cards/ProjectManagerPanel.tsx`** (new):
- List projects (from server `/api/projects` or localStorage)
- Actions: Save, Save As (duplicate with new name), Export, Import, New Project, Delete
- Shows project metadata (name, last modified, floor count, device count)
- Accessible from Settings and/or Build mode menu

**`src/store/useAppStore.ts`** — add `switchProject(id)` action that saves current, loads target.

### Phase 6 — Schema versioning and migration

**`src/lib/projectMigrations.ts`** (new):
- Version 1 = current schema
- Migration registry: `Record<number, (data) => data>`
- Each migration transforms from version N to N+1
- Applied automatically on import and on bootstrap load
- Console logs migration steps for debugging

### Phase 7 — Documentation

Update: `README.md`, `CHANGELOG.md`, `docs/03-using-the-dashboard.md`, `docs/05-data-and-backups.md`
- Document project export/import workflow
- Document where data lives (localStorage vs server `data/projects/`)
- Document how to move projects between devices
- Document schema versioning

### Phase 8 — Patch notes

- CHANGELOG.md entry for 0.6.0
- Version bump in package.json, config.yaml, README badge

---

## Files summary

| Action | File |
|--------|------|
| Create | `src/lib/projectIO.ts` |
| Create | `src/lib/projectMigrations.ts` |
| Create | `src/components/home/cards/ProjectManagerPanel.tsx` |
| Modify | `src/store/types.ts` — add BuildProject interface |
| Modify | `src/store/useAppStore.ts` — fix terrain/comfort sync, add switchProject |
| Modify | `src/components/build/BuildTopToolbar.tsx` — save indicator, export/import actions |
| Modify | `src/components/home/cards/DataBackupCard.tsx` — link to project manager |
| Modify | `README.md`, `CHANGELOG.md`, `docs/03-*`, `docs/05-*` |

Shall I proceed with Phase 1-2 first (schema + persistence fixes), then continue with the rest?

