

# Phase 7 — Smart Placement, Surface Snapping, and Direct Object Controls

## Summary

Four incremental changes: (A) back-face outline shell for selection, (B) surface-aware placement engine using floor elevation + support-surface snapping, (C) long-press quick-action menu, (D) quick rotate buttons in inspector.

## Step 1: Selection Outline (`Props3D.tsx`)

In `displayScene` useMemo (line 267-300), when `isSelected`:
- For each mesh child, create a **clone** with `MeshBasicMaterial({ color: '#ffffff', side: THREE.BackSide, transparent: true, opacity: 0.6 })`, scale clone by `1.04` on all axes, and add as child of the same parent
- Add a safety check: skip outline for meshes with no geometry or very small bounding boxes (< 0.01 units) to avoid artifacts
- Keep warm emissive (`#d4a574`, 0.15) on original mesh for warmth
- **Remove** the floor ring geometry (lines 363-374) — replaced by outline
- Hover: keep existing `#f5e6d3` emissive at 0.08, no outline (cost)

## Step 2: Placement Engine (`src/lib/placementEngine.ts` — new file)

```typescript
// Categories that can act as support surfaces
const SUPPORT_CATEGORIES = new Set(['tables', 'storage', 'kitchen']);
// Only 'table' placement items snap onto support surfaces
// 'floor' items snap to floor elevation
// 'wall'/'ceiling' — passthrough (future)

function getFloorElevation(floorId: string): number {
  const floor = useAppStore.getState().layout.floors.find(f => f.id === floorId);
  return floor?.elevation ?? 0;
}

function findLandingPosition(
  propId: string,
  dragXZ: [number, number],
  currentY: number,
  floorId: string,
  sceneRefs: Map<string, THREE.Group>
): { position: [number, number, number]; snappedTo: 'floor' | 'surface' | 'free' }
```

Logic:
1. Get floor `elevation` from store (not hardcoded 0)
2. Look up dragged prop's `placement` from catalog
3. **floor** placement → Y = floor elevation
4. **table** placement → scan other props on same floor with `SUPPORT_CATEGORIES`. For each, compute bounding box from `sceneRefs`. If drag XZ is within the horizontal bounds and prop is close enough, Y = top of support's bounding box + floor elevation. Fallback: floor elevation
5. **wall/ceiling** → return current Y (future-ready)
6. **no metadata** → Y = max(floor elevation, currentY) (free)

## Step 3: Wire Placement into Props3D (`Props3D.tsx`)

- Add module-level `const sceneRefs = new Map<string, THREE.Group>()` — populated in `handleSuccess` of `doLoad`, cleaned in unmount effect
- In drag `onPointerMove` (line 235-253): replace `Math.max(0, position[1])` with call to `findLandingPosition()`
- On `onPointerUp`: final snap check, update position
- Show a subtle drag shadow during drag: a `<mesh>` with `CircleGeometry(0.3)` + transparent dark material at the landing XZ position, Y = floor elevation + 0.02

## Step 4: Long-Press Quick Menu (`Props3D.tsx`)

State: `const [showQuickMenu, setShowQuickMenu] = useState(false)`
Refs: `longPressTimer`, `pointerDownPos`

In `handlePointerDown`:
- Record `pointerDownPos` and start 500ms timer
- If pointer moves > 5px during timer, cancel
- On timer fire: `setShowQuickMenu(true)`, cancel drag

Menu (via `<Html center>` at object position):
- **Rotera** — rotates 45° per tap
- **Duplicera** — clones prop with +0.5m X offset
- **Ta bort** — removes prop, deselects

Dismiss: on any click outside, Escape key, or deselect.

Desktop: same long-press (no right-click). Touch: identical behavior.

## Step 5: Quick Rotate in Inspector (`BuildInspector.tsx`)

After the rotation slider (line 592-600), add a row of 4 small icon buttons:
- `-90°`, `-45°`, `+45°`, `+90°`
- Each sets rotation directly: `updateProp(prop.id, { rotation: [0, currentRad + delta, 0] })`
- Styled: `h-7 text-[10px] rounded-lg bg-secondary/30 hover:bg-secondary/50`

## Files Changed

| File | Change |
|------|--------|
| `src/components/build/Props3D.tsx` | Outline shell, sceneRefs map, placement engine integration, drag shadow, long-press quick menu |
| `src/lib/placementEngine.ts` | **New** — surface landing logic with floor elevation + support surface bbox checks |
| `src/components/build/BuildInspector.tsx` | Quick rotate buttons |

## Key Corrections Applied

1. **Floor height**: Uses `floor.elevation` from store, not hardcoded `0`
2. **Support surfaces**: Only `tables`, `storage`, `kitchen` categories qualify — small decor never becomes a surface
3. **Outline safety**: Skip outline for degenerate meshes; fallback is emissive-only
4. **Interaction rules**: Right-click = camera only (unchanged). Left-click = select/drag. Long-press = quick menu (no right-click)
5. **Touch**: Long-press works identically. Selected state is primary feedback (outline), not hover-dependent

## Performance

- Outline: 1 extra draw call per mesh in single selected object only
- Placement: bbox checks only during active drag events (event-driven, not per-frame)
- Quick menu: single `<Html>` when open
- No new dependencies

