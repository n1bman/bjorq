

# Camera Surveillance System — Snapshot Fetching via `camera_proxy`

## Summary

Add real camera snapshots to SurveillancePanel by reusing the same pattern already working in `DeviceControlCard`'s `CameraControl`. The key change: add `entityId` to `CameraState`, create a reusable snapshot hook, and wire it into `SurveillancePanel`.

## Flow

```text
HA camera entity → haMapping → CameraState { entityId } → useCameraSnapshot(entityId) → UI renders <img> or placeholder
```

## File Changes

### 1. `src/store/types.ts` — Add `entityId` to `CameraState`

```typescript
export interface CameraState {
  on: boolean;
  streaming: boolean;
  entityId?: string;      // ← NEW: HA entity_id for proxy fetching
  lastSnapshot?: string;  // keep for backward compat
}
```

### 2. `src/lib/haMapping.ts` — Pass entity_id into camera state

The `mapHAEntityToDeviceState` function currently doesn't receive the entity_id. Update its signature to accept it, and include it in the camera case:

```typescript
export function mapHAEntityToDeviceState(
  domain: string,
  state: string,
  attributes: Record<string, unknown>,
  entityId?: string           // ← NEW parameter
): DeviceState | null {
  // ...
  case 'camera':
    return { kind: 'camera', data: { on: state !== 'off', streaming: state === 'streaming', entityId } };
}
```

Update all call sites of `mapHAEntityToDeviceState` to pass the entity_id (in `useHABridge.ts` and anywhere else it's called).

### 3. `src/hooks/useCameraSnapshot.ts` — New reusable hook

Extract the snapshot-polling logic already in `DeviceControlCard`'s `CameraControl` into a standalone hook:

```typescript
useCameraSnapshot(entityId: string | undefined, enabled: boolean): string | null
```

- Hosted mode: `GET /api/ha/camera_proxy/{entityId}?t={timestamp}`
- DEV mode: build URL from `wsUrl` → `{httpBase}/api/camera_proxy/{entityId}?t={timestamp}` with Bearer token header
- Poll every 5s while `enabled`. Returns blob URL or null.
- Cleanup: revoke blob URLs on unmount/refresh.

### 4. `src/components/home/cards/SurveillancePanel.tsx` — Show real snapshots

Extract a `CameraCard` sub-component (hooks can't be called inside `.map()`):

```typescript
function CameraCard({ cam, isOn, onClick }: Props) {
  const entityId = cam.ha?.entityId;
  const snapshotUrl = useCameraSnapshot(entityId, isOn);
  // render <img src={snapshotUrl}> or placeholder icon
}
```

Apply to both grid cards and expanded view. Keep all existing UI (LIVE/OFFLINE badges, motion sensors, activity log) unchanged.

### 5. `src/components/home/cards/DeviceControlCard.tsx` — Refactor to use shared hook

Replace the inline snapshot logic in `CameraControl` (lines 240-282) with `useCameraSnapshot(entityId, data.on && data.streaming)`.

## What stays the same

- Motion sensor section — unchanged
- Camera activity log — unchanged  
- HA integration model (WebSocket + REST polling) — unchanged
- Server proxy (`/api/ha/*`) — already supports `camera_proxy/`, no changes needed

