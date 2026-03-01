

## Plan: Device Visibility Picker, Camera Save Fix, v0.1.9

### 1. Device Visibility Picker (replace simple toggle)

**Current**: Eye button toggles ALL markers on/off globally. User wants per-device control.

**Change `src/components/home/HomeView.tsx`**:
- Replace the simple Eye toggle button with a button that opens a popup/sheet
- Move it to **bottom-left** (e.g., `fixed bottom-20 left-4`) to avoid overlapping with the Camera FAB on the right
- On click: show a glass-panel popup listing all placed device markers with:
  - Device name + kind icon
  - Toggle switch per device (visible/hidden)
  - "Visa alla" / "Dölj alla" quick buttons at top

**Add to `src/store/types.ts`**:
- Add `hiddenMarkerIds: string[]` to `HomeViewState` (list of marker IDs to hide)
- Remove or keep `showDeviceMarkers` as a master toggle

**Add to `src/store/useAppStore.ts`**:
- `toggleMarkerVisibility(id: string)` — adds/removes from `hiddenMarkerIds`
- `setAllMarkersVisible()` / `hideAllMarkers()` — bulk operations
- All with `syncProfileToServer()`

**Update `src/components/devices/DeviceMarkers3D.tsx`**:
- Filter out markers whose IDs are in `hiddenMarkerIds` (or render them invisible for raycasting as current logic does)

### 2. Fix Camera Start Save (not persisting)

**Bug**: `saveHomeStartCamera` and `clearHomeStartCamera` in `useAppStore.ts` (lines 132-145) do NOT call `syncProfileToServer()` after `set()`. Changes are lost on reload in hosted mode.

**Fix `src/store/useAppStore.ts`**:
- Add `syncProfileToServer()` call after both `saveHomeStartCamera` and `clearHomeStartCamera` set calls

### 3. Quick Health Check

Review key areas for obvious issues:
- Verify `cameraRef` is being updated correctly in `CameraController.useFrame` (line 96-99) — looks correct
- Verify performance settings reactivity via Canvas key — looks correct
- Check that `syncProfileToServer` is called on all user-facing state mutations — the camera save is the only one missing it

### 4. Version Bump to 0.1.9

- Update `package.json` version field

### Files Modified (5-6)
1. `src/store/types.ts` — add `hiddenMarkerIds` to HomeViewState
2. `src/store/useAppStore.ts` — add per-marker visibility actions + fix camera save persistence
3. `src/components/home/HomeView.tsx` — replace Eye toggle with popup picker, reposition to left side
4. `src/components/devices/DeviceMarkers3D.tsx` — respect `hiddenMarkerIds`
5. `package.json` — version 0.1.9

