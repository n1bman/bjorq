

## Plan: Remove HA-mapping from furniture + block right-click in build mode

### Problem 1: HA-mapping on furniture is confusing
The HA-mapping dropdown in the import dialog (Lampa, Högtalare, Skärm, etc.) creates a `haMapping` on furniture props. This doesn't work well because:
- The furniture model itself doesn't become interactive (no toggle)
- Adding a device marker on top of a furniture model is awkward to position
- Better to use dedicated device markers for HA entities

### Problem 2: Right-click on 3D models in build mode
Right-clicking triggers browser context menu or interferes with OrbitControls camera rotation on the canvas. Need to prevent default context menu on the 3D canvas.

### Changes

**`src/components/build/BuildModeV2.tsx`**
- Remove the `AC_HA_DOMAINS` constant (lines 116-123)
- Remove `importHAMapping` state (line 164)
- Remove the HA-mapping `<select>` from the import dialog (line 383)
- Remove all `haMapping` logic from `handleImportConfirm` (lines 228-230, and references in lines 234, 244, 246, 253)
- Remove `AssetHAMapping` and `DeviceKind` from imports (line 32)
- Remove `haMappable` from the `ACEntry` interface and card rendering

**`src/components/build/BuildScene3D.tsx`**
- Add `onContextMenu={(e) => e.preventDefault()}` to the canvas wrapper div to block right-click context menu in build mode

**`src/components/build/Props3D.tsx`**
- Add `onContextMenu` handler to the `<primitive>` element that calls `e.nativeEvent.preventDefault()` and stops propagation to prevent right-click interference

