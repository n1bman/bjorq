

# Camera Snapshots Not Showing — CORS Problem in DEV Mode

## Root Cause

In **DEV mode** (Lovable preview / direct WebSocket to HA), the `useCameraSnapshot` hook tries to `fetch()` from the HA instance directly:

```
fetch("https://ha-instance:8123/api/camera_proxy/camera.xxx", { headers: { Authorization: "Bearer ..." } })
```

This fails silently due to **CORS** — the browser blocks cross-origin HTTP requests from the Lovable preview domain to the HA server. The error is caught and swallowed (line 50: `catch { }`), so nothing shows.

In **hosted mode**, the proxy (`/api/ha/camera_proxy/...`) handles this correctly — but the user is in DEV mode with a WebSocket connection.

Key insight: **`<img>` tags are NOT subject to CORS**. HA's `entity_picture` attribute already contains a signed URL like `/api/camera_proxy/camera.x?token=...` that works without Bearer auth headers. We already capture this as `lastSnapshot` in the camera state.

## Fix

### `src/hooks/useCameraSnapshot.ts`

Two-strategy approach based on mode:

**Hosted mode** (unchanged): Use `fetch()` via server proxy → blob URL. Works perfectly, no CORS.

**DEV mode** (new): Instead of `fetch()`, construct a direct image URL from the HA base URL + `entity_picture` path. Return this URL directly (no fetch needed). `<img src="https://ha:8123/api/camera_proxy/camera.x?token=...">` loads fine — img tags bypass CORS.

Changes:
- Accept an optional `entityPicture` parameter (the signed path from HA attributes)
- In DEV mode: build `${httpBase}${entityPicture}` and return it directly, append `&t=timestamp` for cache-busting, poll by updating the timestamp
- In hosted mode: keep the existing fetch-to-blob approach
- Add `console.warn` on fetch failures instead of silent catch

### `src/components/home/cards/SurveillancePanel.tsx`

- Pass `lastSnapshot` from the camera state to the hook
- `CameraCard` and `ExpandedCamera` already resolve `entityId` and use the hook — just add `lastSnapshot` pass-through

### `src/components/home/cards/DeviceControlCard.tsx`

- `CameraControl` already has access to `data.lastSnapshot` — pass it to the hook

### `src/hooks/useCameraSnapshot.ts` — Updated signature

```typescript
useCameraSnapshot(
  entityId: string | undefined,
  enabled: boolean,
  entityPicture?: string,  // signed HA path like /api/camera_proxy/camera.x?token=...
  intervalMs?: number
): string | null
```

| File | Change |
|---|---|
| `src/hooks/useCameraSnapshot.ts` | Add DEV mode direct-URL strategy using entity_picture; keep hosted proxy fetch |
| `src/components/home/cards/SurveillancePanel.tsx` | Pass `lastSnapshot` to hook |
| `src/components/home/cards/DeviceControlCard.tsx` | Pass `data.lastSnapshot` to hook |

