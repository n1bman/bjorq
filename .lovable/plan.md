

# Phase 1: Shell Refactor — Bygge → Design (Planritning / Inredning / Bibliotek)

## Audit Complete

All references mapped. Here is the final function assignment and implementation plan.

### Function Mapping

| Current Function | New Location | Notes |
|---|---|---|
| select, wall, room, door, passage, window, garage-door, stairs, measure, calibrate, erase, copy, template, paint | **Planritning** | All structural tools |
| Reference drawing import (floorplan image) | **Planritning** | Stays here |
| 3D home model import (GLB of house) | **Planritning** | Structural import, not asset library |
| ImportTools side panel (imported model controls) | **Planritning** | Controls for imported home geometry |
| OpeningCatalog (door/window presets) | **Planritning** | Contextual catalog row |
| PaintCatalog (wall/floor materials) | **Planritning** | Contextual catalog row |
| furnish (catalog browse + place) | **Inredning** | Curated catalog view |
| wizard (browse + import wizard assets) | **Inredning** | Wizard assets accessible here |
| All place-* device tools | **Inredning** | Smart device placement |
| Device panel (HA entity picker) | **Inredning** | HA linking |
| Vacuum mapping tools | **Inredning** | Specialty placement |
| Props select/move/rotate/scale | **Inredning** | Object interaction |
| AssetCatalog (import button, manage dialog, full registry, metadata) | **Bibliotek** | Admin/curation workspace |
| Undo/redo, 2D/3D toggle, project IO, grid, ghost floors | **Shared toolbar** | Available in all modes |

### Files to Change (Phase 1)

| File | Change | Backup needed |
|---|---|---|
| `src/store/types.ts` | `BuildTab` type → `'planritning' \| 'inredning' \| 'bibliotek'` | Yes |
| `src/store/useAppStore.ts` | Default tab → `'planritning'`, persist version 15→16, migration for old tab values | Yes |
| `src/components/build/BuildModeV2.tsx` | Replace `BuildBottomDock` with `DesignTabBar` (3 tabs + contextual sub-tools), update panel visibility logic, update all tab string references | Yes |
| `src/components/build/BuildTabBar.tsx` | Rewrite with 3 new tabs | Yes |
| `src/components/build/BuildLeftPanel.tsx` | Update category tabs and `'structure'` checks | Yes |
| `src/components/build/BuildCanvas2D.tsx` | `tab === 'import'` → `tab === 'planritning'` (line 807) | Yes |
| `src/components/home/HomeNav.tsx` | `'Bygge'` → `'Design'` | Yes |
| `src/components/BottomNav.tsx` | `'Bygge'` → `'Design'` | Yes |
| `src/components/ModeHeader.tsx` | `'Bygge'` → `'Design'`, subtitle update | Yes |

Additionally, update informational `Bygge` references in these files (non-critical, but keeps text consistent):
- `src/components/home/cards/SurveillancePanel.tsx`
- `src/components/home/DashboardGrid.tsx`
- `src/components/home/cards/DevicesSection.tsx`
- `src/components/home/cards/EnvironmentPanel.tsx`
- `src/components/home/cards/RobotPanel.tsx`
- `src/hooks/useHABridge.ts`

### Key Implementation Details

**DesignTabBar** replaces `BuildBottomDock` (lines 1285-1335):
- 3 primary tab buttons: Planritning (Ruler), Inredning (Sofa), Bibliotek (Archive)
- Below tabs: contextual sub-tools per active tab

**Planritning sub-tools**: Välj, Vägg, Rum, Dörr, Passage, Fönster, Garage, Trappa, Mät, Import (reference/3D home), Radera

**Inredning sub-tools**: Välj, Möbler, Wizard, Enheter

**Bibliotek**: No sub-tools bar — the full AssetCatalog panel with import/manage/registry becomes the main content

**Panel visibility update** (lines 1341-1394):
- `showImportPanel`: when `tab === 'planritning'` and imported home model exists
- `showFurnishPanel`: when `tab === 'inredning'` and furnish/wizard tool active
- `showBibliotekPanel`: when `tab === 'bibliotek'` (always show AssetCatalog with full admin)
- `showDevicePanel`: when device placement tool active (unchanged logic)

**State migration** (persist version 16):
```
structure → planritning
import → planritning  
furnish → inredning
devices → inredning
```

### What is NOT changed in Phase 1
- No tool logic modifications
- No 3D/2D rendering changes
- No catalog UX restructuring (just panel routing)
- No visual refinement
- All HA sync, weather, environment, save/load — completely untouched
- All 14 current dock tools remain accessible

### Backup strategy
Path-preserving backups in `src/backup/` mirroring original structure:
```
src/backup/store/types.ts
src/backup/store/useAppStore.ts
src/backup/components/build/BuildModeV2.tsx
src/backup/components/build/BuildTabBar.tsx
src/backup/components/build/BuildLeftPanel.tsx
src/backup/components/build/BuildCanvas2D.tsx
src/backup/components/home/HomeNav.tsx
src/backup/components/BottomNav.tsx
src/backup/components/ModeHeader.tsx
```

