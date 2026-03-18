

# Fix: Build error — missing RoomWallSurfaces3D

## Problem
`RoomWallSurfaces3D.tsx` was deleted during a revert but both `Walls3D.tsx` (line 8, 30) and `InteractiveWalls3D.tsx` (line 9, plus usage) still import it.

## Solution
Two options — we need both the cleanup AND the re-creation since the plan is to use this component:

**Re-create `src/components/build/RoomWallSurfaces3D.tsx`** with the full implementation from the approved plan (per-room interior wall-finish surfaces with T-junction clipping and opening subtraction).

This was already implemented once but lost during the revert. The file needs to be recreated with:
- `clipWallToRoom()` — projects room polygon onto wall axis to bound surfaces at T-junctions
- `generateClippedStrips()` — subtracts openings (doors/windows/passages) from the surface
- `getRoomFacingSide()` — determines which wall face is interior to the room
- Material rendering from `room.wallMaterialId`
- Props: `rooms`, `walls`, `elevation`, optional `interactive` and `onRoomClick`

## Files
| File | Change |
|------|--------|
| `src/components/build/RoomWallSurfaces3D.tsx` | **Create** — full implementation |

No changes needed to `Walls3D.tsx` or `InteractiveWalls3D.tsx` — their imports are already correct.

