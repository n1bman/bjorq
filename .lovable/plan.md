

# Fix Vacuum HA Commands, Zone Labels & 3D Movement

## 1. HA Room Cleaning — Wrong Command Format

**Problem**: `app_segment_clean` for Roborock expects **segment IDs** (integers), not room names. Current code sends `params: { name: "Sovrum" }` which Roborock ignores.

**Fix in `src/store/types.ts`**: Add optional `segmentId?: number` to `VacuumZone`.

**Fix in `src/components/build/devices/VacuumMappingTools.tsx`**: Add a numeric input field for segment ID on each zone. Show helper text: "Segment-ID från Roborock (hitta via HA Developer Tools)".

**Fix in `src/hooks/useHABridge.ts`** (lines 111-118): Look up the zone's `segmentId` from the floor's `vacuumMapping.zones`. Change params format from `{ name: targetRoom }` to `[segmentId]` (array). If no segmentId is configured, fall back to `vacuum.start` (clean all).

```typescript
// New logic in vacuum case:
if (data.targetRoom && data.status === 'cleaning') {
  // Find segment ID from zone mapping
  const marker = markers.find(m => m.id === id);
  const floor = floors.find(f => f.id === marker?.floorId);
  const zone = floor?.vacuumMapping?.zones?.find(z => z.roomId === data.targetRoom);
  if (zone?.segmentId) {
    callService('vacuum', 'send_command', {
      entity_id: entityId,
      command: 'app_segment_clean',
      params: [zone.segmentId],
    });
  } else {
    callService('vacuum', 'start', { entity_id: entityId });
  }
  break;
}
```

**Problem**: `useHABridge` doesn't have access to floor/zone data. Fix by reading it from the store inside `sendHACommand`:
```typescript
const storeState = useAppStore.getState();
const marker = storeState.devices.markers.find(m => m.ha?.entityId === entityId);
const floor = storeState.layout.floors.find(f => f.id === marker?.floorId);
```

## 2. Zone Label Text Outside Polygon

**Problem**: Centroid of concave polygons can fall outside the shape.

**Fix in `src/components/build/BuildCanvas2D.tsx`** (lines 573-583) and `src/components/home/cards/RobotPanel.tsx` (mini-map labels): Use the `pointInPolygon` function to check if centroid is inside. If not, use rejection sampling to find a point inside (reuse `randomPointInPolygon` from `vacuumGeometry.ts`, but pick the centroid-closest valid point).

Simpler approach: import `pointInPolygon` and if centroid is outside, clip the label position to the polygon's visual center by averaging only boundary midpoints. Or just use a guaranteed-inside point via the existing `randomPointInPolygon` with a fixed seed.

Actually simplest: compute centroid, if `!pointInPolygon(cx, cz, polygon)` then find the closest polygon vertex midpoint that IS inside.

## 3. Robot 3D Movement — More Natural Wandering

**Problem**: Robot moves in straight lines between random targets, looks like back-and-forth.

**Fix in `src/components/devices/DeviceMarkers3D.tsx`** (lines 526-552): Add slight curve to movement by introducing a small perpendicular offset (sine wave along path). Also add slight random rotation wobble to simulate real vacuum behavior. Pick new random targets more frequently (reduce threshold from 0.1 to 0.05) and add a small delay/direction change.

## Files to Change

| File | Change |
|------|--------|
| `src/store/types.ts` | Add `segmentId?: number` to `VacuumZone` |
| `src/hooks/useHABridge.ts` | Read zone segmentId from store, send `[segmentId]` format |
| `src/components/build/devices/VacuumMappingTools.tsx` | Add segment ID input per zone |
| `src/components/build/BuildCanvas2D.tsx` | Fix zone label to stay inside polygon |
| `src/components/devices/DeviceMarkers3D.tsx` | Add curved/natural wandering pattern |
| `src/components/home/cards/RobotPanel.tsx` | Fix mini-map label centering |

