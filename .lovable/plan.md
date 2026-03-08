

# Fix Camera Snapshots in Compact Widget View

## Problem

The compact camera card in `DeviceControlCard` (lines 77-103) — rendered in HomeView's device widget strip — shows only a static `<Video>` icon placeholder. It never calls `useCameraSnapshot` because it's inline conditional code inside the component (hooks can't be called conditionally).

The expanded `CameraControl` component and `SurveillancePanel` both work correctly because they're separate components with proper hook calls.

## Fix

Extract the compact camera view into its own sub-component `CompactCameraCard` so it can call `useCameraSnapshot`. This mirrors the same pattern already used in `SurveillancePanel` with `CameraCard`.

### `src/components/home/cards/DeviceControlCard.tsx`

**Add new component** (near the other sub-components):

```typescript
function CompactCameraCard({ marker, data }: { marker: DeviceMarker; data: CameraState }) {
  const entityId = data.entityId || marker.ha?.entityId;
  const snapshotUrl = useCameraSnapshot(entityId, data.on, data.lastSnapshot);
  const wc = marker.widgetConfig;

  return (
    <div className="space-y-1.5">
      {(wc?.showImage !== false) && (
        <div className="relative rounded-lg overflow-hidden aspect-video bg-black/60">
          {snapshotUrl ? (
            <img src={snapshotUrl} alt={marker.name || 'Kamera'} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Video size={20} className="text-muted-foreground" />
            </div>
          )}
          {data.on && (
            <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-red-500/80 rounded px-1 py-0.5">
              <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
              <span className="text-[8px] text-white font-bold">LIVE</span>
            </div>
          )}
        </div>
      )}
      {(wc?.showLabel !== false) && (
        <p className="text-[10px] text-muted-foreground truncate">{wc?.customLabel || marker.name || 'Kamera'}</p>
      )}
    </div>
  );
}
```

**Replace lines 78-103** — the inline camera compact block — with:
```typescript
if (state.kind === 'camera') {
  return <CompactCameraCard marker={marker} data={state.data as CameraState} />;
}
```

One component, one file change. The snapshot hook is already imported and working — it just wasn't being called in the compact view.

