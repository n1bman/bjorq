

## Problem

The outer `<group rotation={marker.rotation}>` wraps each component, but the component applies `position` internally via `<group position={position}>`. This means rotation happens around the **world origin** (0,0,0) instead of around the device's own position — causing devices to orbit around the scene center when rotated.

## Fix

**`src/components/devices/DeviceMarkers3D.tsx`** (render loop, ~line 946):

Change the structure from:
```
<group rotation={rotation}>        ← rotates around origin
  <Component position={position}>  ← then offsets
```

To:
```
<group position={position} rotation={rotation}>  ← position first, then rotate in-place
  <Component position={[0,0,0]}>                 ← no offset inside
```

Concretely:
1. On the outer `<group>` (line 946): add `position={marker.position}` and keep `rotation={marker.rotation}`.
2. Override `position` prop passed to `<Component>` to `[0, 0, 0]` (line 947-948).

This makes rotation happen around the device's own position. The rotation slider in `DeviceInspector` (Y-axis, line 687-690) already works — it just needs the correct group nesting.

