

## Plan: Settings Reorganization, Camera Fix, Profile, Widgets Tab, Install Scripts — v0.2.2

This is a large scope. Breaking into 3 phases.

---

### Phase 1: Camera Start View Fix + Saved View in Camera FAB (critical bug)

**Root cause**: `Index.tsx` renders completely different component trees for `home` vs `dashboard` vs `build`. When switching modes, `Scene3D` (and `CameraController` inside it) is **unmounted and remounted**. On mount, `prevMode.current` is initialized to the current `appMode`, so the condition `prevMode.current !== appMode` is immediately false — the saved camera position never applies.

**Fix** (`src/components/Scene3D.tsx`):
- On `CameraController` mount, immediately apply the saved start position if in `home`/`dashboard` mode (remove the `prevMode.current !== appMode` guard for the initial mount). Use an `initialApplied` ref to ensure it only fires once on mount.
- Keep the second effect for live saves.

**Add "Sparad vy" to Camera FAB** (`src/components/home/CameraFab.tsx`):
- If `customStartPos` exists, add a 5th option: `{ key: 'saved', label: 'Sparad vy', icon: Save }`.
- When clicked, set `lerpingTo` to the saved coordinates. Implement by calling `setCameraPreset('free')` first, then dispatching a custom action or directly setting the store's start pos values to trigger the second effect.
- Simplest: add a new store action `applySavedCameraView()` that re-sets `customStartPos` to itself (triggering the effect), or add a dedicated `cameraLerpTrigger` counter.

### Phase 2: Settings Reorganization + Enhanced Profile

**Reorganize settings sections** (`src/components/home/DashboardGrid.tsx` SettingsCategory):

Current layout:
```text
Utseende:   ProfilePanel | CameraStartSettings
System:     PerformanceSettings | StandbySettingsPanel
Skärm:      DisplaySettings
Anslutning: HAConnectionPanel | LocationSettings | WifiPanel
Widgets:    HomeWidgetConfig
```

New layout:
```text
Profil:     ProfilePanel (enhanced)
Utseende:   ThemeCard (extracted from ProfilePanel: tema, accent, bakgrund)
System:     PerformanceSettings | SystemStatusCard (moved from ProfilePanel)
Skärm:      DisplaySettings | StandbySettingsPanel | CameraStartSettings
Anslutning: HAConnectionPanel | LocationSettings | WifiPanel
Data:       DataBackupCard (extracted from ProfilePanel)
```

**Enhanced ProfilePanel** — split into focused cards:
- **ProfilePanel** (top): Name, version, location, connected accounts section with placeholders for Spotify, Gmail/Outlook, HA status. Keep compact.
- **ThemeCard** (new): Theme selector, accent color, background — extracted from current ProfilePanel.
- **DataBackupCard** (new): Export/import/clear/demo — extracted from current ProfilePanel.
- **SystemStatusCard**: Move to System section as its own card (already a separate component inside ProfilePanel).

**Move Standby to Skärm**: Standby is display-related (screen timeout). Move `StandbySettingsPanel` from System to Skärm section.

**Move CameraStartSettings to Skärm**: Camera start view is a display/viewing concern.

**Move SystemStatusCard to System**: Currently nested inside ProfilePanel.

### Phase 3: Widgets Tab + Install Script Improvements + Release

**Add Widgets tab** (`src/components/home/DashboardGrid.tsx`):
- Add `'widgets'` to `DashCategory` type.
- Insert between `activity` and `settings` in the tab bar with a grid/layout icon.
- Content: render `HomeWidgetConfig` component.
- Remove Widgets section from SettingsCategory.

**Improve install/start scripts for PowerShell compatibility**:

`start.bat` — works in CMD but not PowerShell. Issues:
- `%errorlevel%` doesn't work in PowerShell
- `where` command behaves differently
- `start ""` syntax is CMD-specific

**Create `start.ps1`** (new):
```powershell
# PowerShell-native start script
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js not found..."
    exit 1
}
# Auto-install, start server, open browser
```

**Create `install.ps1`** (new):
```powershell
# PowerShell-native install script
```

**Update `start.bat`**: Add a shim at the top that detects PowerShell and re-launches as `start.ps1` if needed. Or keep separate and document both options.

**Update `.github/workflows/release.yml`**:
- Include `start.ps1` and `install.ps1` in both artifacts.
- Add a clear `QUICK-START.txt` file to the ZIP with step-by-step instructions for Windows (CMD, PowerShell, WSL) and Linux.

**Update CHANGELOG.md** with all changes.

**Bump `package.json`** to `0.2.2`.

### Files Modified/Created (~12)

Phase 1 (2):
1. `src/components/Scene3D.tsx` — fix mount-time camera apply
2. `src/components/home/CameraFab.tsx` — add "Sparad vy" option

Phase 2 (3):
3. `src/components/home/cards/ProfilePanel.tsx` — split into ProfilePanel + ThemeCard + DataBackupCard
4. `src/components/home/DashboardGrid.tsx` — reorganize sections, add widgets tab

Phase 3 (6):
5. `start.ps1` — new PowerShell start script
6. `install.ps1` — new PowerShell install script
7. `public/QUICK-START.txt` — new installation guide included in release
8. `.github/workflows/release.yml` — include PS1 scripts + QUICK-START.txt
9. `CHANGELOG.md` — document all changes
10. `package.json` — version 0.2.2

