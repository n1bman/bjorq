

# Room Context, Scene Integration & Navigation System

## Overview

This is a large multi-phase system. I recommend implementing it incrementally across multiple conversations. Here is the full plan broken into implementable phases.

---

## Phase 1 — Device ↔ Room Auto-Assignment (Foundation)

**Goal**: Devices automatically get a `roomId` when placed, with manual override in inspector.

### Changes

**`src/store/types.ts`**
- `DeviceMarker.roomId` already exists (line 332) — no change needed

**`src/lib/roomDetection.ts`**
- Add exported `findRoomForPoint(rooms: Room[], point: [number, number]): string | null` — uses existing point-in-polygon to find which room contains a given x,z coordinate

**`src/store/useAppStore.ts`**
- In `addDevice()`: after adding the marker, call `findRoomForPoint` using the device's x,z position and the current floor's rooms to auto-set `roomId`
- Add `assignDeviceRoom(deviceId, roomId)` action for manual override

**`src/components/build/BuildInspector.tsx`** (DeviceInspector section)
- Add a "Rum" field showing auto-detected room name with a dropdown to change/clear it

**`src/store/useAppStore.ts`** (room detection subscriber, line 1622-1631)
- After `detectRooms` runs, re-assign `roomId` for all devices on that floor whose current `roomId` no longer matches any room polygon

---

## Phase 2 — Room Detail Panel

**Goal**: Selecting a room shows devices, scenes, and automations linked to it.

### Changes

**`src/components/build/BuildInspector.tsx`** (RoomInspector)
- Extend existing RoomInspector to show:
  - List of devices where `marker.roomId === room.id`
  - List of scenes containing devices in this room
  - Camera preset save/go buttons (Phase 4 preview)

**`src/components/home/cards/RoomDetailPanel.tsx`** (new)
- Home-view room panel accessible from room navigator (Phase 5)
- Shows room name, device list with toggle controls, linked scenes with activate buttons, linked automations

---

## Phase 3 — Scene ↔ Room Linking

**Goal**: Scenes can optionally target rooms.

### Changes

**`src/store/types.ts`**
- Extend `SavedScene`:
```typescript
interface SavedScene {
  // ...existing
  linkedRoomIds?: string[];
  scope?: 'global' | 'room' | 'custom';
  cameraMode?: 'none' | 'first-linked-room' | 'custom';
  customCameraPreset?: { position: [number, number, number]; target: [number, number, number] };
}
```

**`src/components/home/cards/ScenesPanel.tsx`**
- Add room selector (checkboxes) when creating/editing a scene
- Show room tags on scene cards

**`src/store/useAppStore.ts`**
- `activateScene`: if scene has `cameraMode === 'first-linked-room'`, trigger camera fly-to

---

## Phase 4 — Room Camera Presets

**Goal**: Each room can store a camera position for quick navigation.

### Changes

**`src/store/types.ts`**
- Extend `Room`:
```typescript
interface Room {
  // ...existing
  cameraPreset?: { position: [number, number, number]; target: [number, number, number] };
}
```

**`src/lib/roomDetection.ts`**
- Preserve `cameraPreset` during room re-detection (same overlap logic that preserves name/material)

**`src/components/build/BuildInspector.tsx`** (RoomInspector)
- "Spara kameravy" button: captures current camera from `cameraRef`
- "Gå till vy" button: triggers fly-to animation

**`src/lib/cameraRef.ts`**
- Add `flyTo(position, target)` function that components can call — sets a target state that the CameraController lerps to

---

## Phase 5 — Room Navigation UI (Home View)

**Goal**: Room navigator button next to camera FAB.

### Changes

**`src/components/home/RoomNavigator.tsx`** (new)
- FAB button with door icon, similar to CameraFab
- Opens panel listing all rooms with device counts
- Clicking a room calls `flyTo(room.cameraPreset)` — or auto-calculates a top-down view from room polygon centroid if no preset saved
- Optional: highlight room polygon in 3D when navigator is open

**`src/components/home/HomeView.tsx`**
- Add `<RoomNavigator />` next to `<CameraFab />`

---

## Phase 6 — Room-Aware Automations

**Goal**: Automations can reference rooms.

### Changes

**`src/store/types.ts`**
- Extend `Automation`:
```typescript
interface Automation {
  // ...existing
  linkedRoomIds?: string[];
}
```

**`src/components/home/cards/AutomationsPanel.tsx`**
- Add room selector when creating/editing automation
- Show room tags on automation cards

---

## Phase 7-8 — Scene Camera Integration & UX Layer

Covered by Phase 3 (`cameraMode` on scenes) and Phase 5 (room navigator). No additional major components needed — these are UX refinements that emerge from the previous phases.

---

## Phase 9 — Documentation & Patch Notes

**Files to update:**
- `README.md` — add Room Context System section
- `CHANGELOG.md` — add version entry
- `docs/03-using-the-dashboard.md` — room navigation, device-room linking
- `docs/01-overview.md` — architecture update

---

## Implementation Order

I recommend implementing **Phase 1 first** (device-room auto-assignment + inspector UI), as it's the foundation everything else builds on. Each subsequent phase can be done in a separate conversation.

**Phase 1 estimated scope**: ~5 files changed, ~150 lines added

Shall I proceed with Phase 1?

