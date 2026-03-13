

# Phase A1 — Shared Wall Geometry Refactor

## What This Does
Extracts all duplicated wall geometry logic from `Walls3D.tsx` (465 lines) and `InteractiveWalls3D.tsx` (558 lines) into `src/lib/wallGeometry.ts`. Both renderers will call the same functions. No visual changes.

## Discovered Differences Between the Two Files

Before extracting, these divergences must be handled:

| Aspect | Walls3D | InteractiveWalls3D |
|--------|---------|-------------------|
| Wall height variable | `renderHeight` (alias for `wall.height`) | `wall.height` directly |
| `resolveWallColors` | No fallback material | Passes `wallRoomMaterial[wall.id]` as fallback |
| Material creation | Plain colors | Adds highlight/emissive overrides for selection/hover |
| Opening meshes | No event handlers | `onPointerDown` on each opening mesh |
| Opening emissive | None | `opEmissive`/`opEmissiveIntensity` for selected opening |
| Window reveal | Not present | Has inner reveal mesh (top reveal, lines 339-349) |
| Corner block material | Has `polygonOffset` props | No `polygonOffset` |
| Wall group wrapper | Plain `<group key>` | `<group>` with `onPointerDown/Enter/Leave` |
| Node spheres | Not rendered | Rendered when `activeTool === 'select'` |

## Shared Module Design: `src/lib/wallGeometry.ts`

### Exports

```typescript
// Pure computation — no JSX
export function getConnectedThickness(walls, wallId, point, eps?): number

export function computeWallMitering(wall, allWalls): {
  length, cx, cz, origLength, origCx, origCz, angle, dx, dz
}

// JSX-producing — accepts options for interactivity
export interface WallRenderOptions {
  fallbackMaterialId?: string;
  highlightColor?: string | null;
  emissive?: string;
  emissiveIntensity?: number;
  onOpeningClick?: (e, openingId: string) => void;
  selectedOpeningId?: string | null;
  includeWindowReveal?: boolean;
}

export function generateWallSegments(
  wall: WallSegment, allWalls: WallSegment[],
  elevation: number, options?: WallRenderOptions
): JSX.Element[]

export interface CornerBlockOptions {
  fallbackMaterialMap?: Record<string, string>;
  polygonOffset?: boolean;
}

export function generateCornerBlocks(
  walls: WallSegment[], elevation: number,
  options?: CornerBlockOptions
): JSX.Element[]
```

### Implementation Strategy

- `generateWallSegments` contains the full mitering + opening splitting + door/window/garage/passage rendering logic
- Opening emissive and `onPointerDown` are conditionally applied based on `options`
- Window reveal meshes are included when `options.includeWindowReveal` is true (InteractiveWalls3D sets this)
- `generateCornerBlocks` contains the node-map + corner block logic, with optional `polygonOffset`

### Resulting File Sizes

| File | Before | After |
|------|--------|-------|
| `wallGeometry.ts` | — | ~400 lines |
| `Walls3D.tsx` | 465 lines | ~30 lines |
| `InteractiveWalls3D.tsx` | 558 lines | ~80 lines |

## Refactored Walls3D.tsx (sketch)

```typescript
import { generateWallSegments, generateCornerBlocks } from '../../lib/wallGeometry';

export default function Walls3D() {
  const floors = useAppStore(s => s.layout.floors);
  const activeFloorId = useAppStore(s => s.layout.activeFloorId);
  const floor = floors.find(f => f.id === activeFloorId);
  const walls = floor?.walls ?? [];
  const elevation = floor?.elevation ?? 0;

  const wallMeshes = useMemo(() =>
    walls.map(wall => (
      <group key={wall.id}>
        {generateWallSegments(wall, walls, elevation)}
      </group>
    )), [walls, elevation]);

  const cornerBlocks = useMemo(() =>
    generateCornerBlocks(walls, elevation, { polygonOffset: true }),
    [walls, elevation]);

  return <group renderOrder={1}>{wallMeshes}{cornerBlocks}</group>;
}
```

## Refactored InteractiveWalls3D.tsx (sketch)

Keeps: selection/hover state, wallRoomMaterial lookup, event handlers, node spheres.
Delegates: all geometry generation to `wallGeometry.ts` via options.

## Files Changed

| File | Action |
|------|--------|
| `src/lib/wallGeometry.ts` | **Create** — shared wall geometry module |
| `src/components/build/Walls3D.tsx` | **Rewrite** — thin wrapper calling shared module |
| `src/components/build/InteractiveWalls3D.tsx` | **Rewrite** — thin wrapper with interaction layer |

## What Is Preserved
- Identical visual output in both home and build modes
- All opening types (door, window, garage, passage) with all styles
- Corner fill blocks
- Wall mitering
- Selection/hover highlighting in build mode
- Node spheres in build mode
- Room-based material fallback
- Save/load — no data model changes

## Backups
Will create backups of both wall renderer files before editing.

