

# Phase C1 — Basic Wall-Mounted Objects

## Overview

Enable props with `placement: 'wall'` to snap onto wall faces when placed, storing their wall attachment info for correct alignment and persistence.

## Changes

### 1. Extend `PropItem` type with wall mount data
**File: `src/store/types.ts`**

Add optional wall-mount fields to `PropItem`:
```typescript
// Wall-mount attachment (Phase C1)
wallMountInfo?: {
  wallId: string;
  faceSide: 'left' | 'right';
  offsetAlongWall: number;  // 0-1 fraction along wall length
  heightOnWall: number;     // meters from floor elevation
};
```

This is backward-compatible — existing props without it remain floor-placed.

### 2. Wall-mount placement logic
**New file: `src/lib/wallMountPlacement.ts`**

Pure utility functions:
- `computeWallMountTransform(wall, faceSide, offsetAlongWall, heightOnWall)` — returns `{ position, rotation }` aligned to wall normal with a small offset (0.02m) to avoid z-fighting
- `isWallMountable(catalogItem)` — returns true if `placement === 'wall'` or category is in allowlist (`'lighting'`, `'decor'`)
- `clickToWallMount(wall, clickPoint3D, elevation)` — converts a 3D click point on a wall into `{ faceSide, offsetAlongWall, heightOnWall }`

### 3. Wall-mount placement interaction
**File: `src/components/build/InteractiveWalls3D.tsx`**

Extend wall click handler: when active tool is `'furnish'` and a wall-mountable item is selected for placement (tracked via a new store field `pendingWallMount`), clicking a wall face:
1. Computes mount transform via the new utility
2. Creates the prop with `wallMountInfo` populated
3. Sets position/rotation from the computed transform
4. Clears the pending state

Add hover preview: when `pendingWallMount` is set and hovering a wall, show a small translucent indicator plane at the projected mount point.

### 4. Furnish tool integration
**File: `src/components/build/furnish/FurnishTools.tsx` or `BuildModeV2.tsx`**

When user clicks a wall-placement catalog item in the furnish panel:
- Instead of immediately placing at floor origin, set `pendingWallMount: { catalogId }` in build state
- Show a toast/hint: "Klicka på en vägg för att placera"
- Next wall click completes placement

### 5. Store additions
**File: `src/store/useAppStore.ts`**

- Add `pendingWallMount: { catalogId: string } | null` to build state
- Add `setPendingWallMount` action
- Ensure `addProp` accepts `wallMountInfo`

### 6. Prop rendering for wall-mounted items
**File: `src/components/build/Props3D.tsx`**

For props with `wallMountInfo`:
- Disable floor-drag behavior (no Y-plane dragging)
- On drag, constrain movement along the wall face only (slide along wall + up/down)
- Update `wallMountInfo` offset/height on drag end

### 7. Visual feedback during placement
**File: `src/components/build/InteractiveWalls3D.tsx`**

When `pendingWallMount` is active:
- Highlight mountable wall faces on hover (reuse existing face highlight from B2 paint mode, but in a different color — e.g., soft blue)
- Show a small crosshair/dot at the projected placement point

## Files Changed Summary

| File | Change |
|------|--------|
| `src/store/types.ts` | Add `wallMountInfo` to `PropItem`, `pendingWallMount` to `BuildState` |
| `src/lib/wallMountPlacement.ts` | New — mount transform math, eligibility check |
| `src/components/build/InteractiveWalls3D.tsx` | Wall click handler for mount placement + hover preview |
| `src/components/build/Props3D.tsx` | Constrained drag for wall-mounted props |
| `src/store/useAppStore.ts` | `setPendingWallMount` action |
| `src/components/build/BuildModeV2.tsx` | Wire furnish catalog to trigger wall-mount flow for eligible items |

## What is preserved
- All floor/table placement behavior unchanged
- Paint mode face targeting unchanged
- Save/load compatible (new optional field)
- No changes to wall drawing, room detection, or openings

## Scope boundaries
- Only left/right primary wall faces are mountable
- No shelf-with-surface-support logic
- No advanced collision detection
- Drag along wall is basic (slide offset + height)

