

# Fix: Camera Save View Persistence + Version Bump

## Bugs Found

### Bug 1: Camera preset overrides saved position on reload
In `InteractiveCameraController` (PersistentScene3D.tsx), three effects run on mount:
1. **Initial effect** (line 152): Sets `lerpingTo` to `customStartPos` if it exists — correct.
2. **Preset effect** (line 176): Fires with `cameraPreset = 'angle'` (default) and overwrites `lerpingTo` with the angle preset — **this erases the saved position**.

**Fix**: When `customStartPos` exists, the preset effect should not override it on initial mount. Add a guard: skip the preset effect if `customStartPos` is set and the preset hasn't actually changed from its initial value.

### Bug 2: Dashboard save reads wrong camera
The DashboardPreview3D has its own `<Canvas>` with its own camera, but the save dialog reads from `cameraRef` which tracks the **PersistentScene3D** camera (hidden behind the opaque dashboard). The user rotates the preview widget camera, clicks save, but captures the wrong camera's position.

**Fix**: The DashboardPreview3D component needs to expose its own camera position. We'll add an `onCameraChange` callback that updates a local ref with the preview camera's position/target, then use that ref when saving.

## Files to Change

| File | Change |
|------|--------|
| `src/components/PersistentScene3D.tsx` | Fix preset effect to not override `customStartPos` on initial mount |
| `src/components/home/DashboardPreview3D.tsx` | Add camera tracking via `useFrame` + expose camera ref via callback prop |
| `src/components/home/DashboardGrid.tsx` | Use DashboardPreview3D's camera ref instead of `cameraRef` when saving |
| `package.json` | Bump to `1.6.1` |
| `CHANGELOG.md` | Add 1.6.1 entry |
| `docs/patchnotes-v1.6.0.md` | Update with v1.6.1 fixes |

## Key Fix Details

### PersistentScene3D — InteractiveCameraController
```typescript
// Preset effect: skip if we have a saved custom position (already applied by initial effect)
useEffect(() => {
  if (!initialApplied.current) return;
  if (cameraPreset === 'free') return;
  // Don't override saved position with default preset on mount
  if ((customStartPos) && cameraPreset === 'angle') return;
  lerpingTo.current = {
    pos: presetPositions[cameraPreset].clone(),
    target: presetTargets[cameraPreset].clone(),
  };
}, [cameraPreset]);
```

### DashboardPreview3D — Camera tracking
Add a `useFrame` hook inside PreviewScene that writes to a shared ref, and accept an `onCameraRef` prop to expose it to parent.

### DashboardGrid — Save from correct camera
Use a `useRef` to capture the preview camera position from DashboardPreview3D, then read from that ref (instead of `cameraRef`) in the save handler.

