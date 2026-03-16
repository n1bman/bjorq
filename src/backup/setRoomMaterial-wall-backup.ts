/**
 * BACKUP: Original setRoomMaterial wall-branch (target === 'wall')
 * Backed up before replacing with room-surface-layer approach.
 * 
 * Original location: src/store/useAppStore.ts, lines 724-782
 * Date: 2026-03-16
 * 
 * Files affected by this change:
 * - src/store/useAppStore.ts (setRoomMaterial wall-branch replaced)
 * - src/components/build/Walls3D.tsx (added RoomWallSurfaces3D)
 * - src/components/build/InteractiveWalls3D.tsx (added RoomWallSurfaces3D)
 * - src/components/build/RoomWallSurfaces3D.tsx (new file)
 * 
 * ROLLBACK INSTRUCTIONS:
 * 1. Replace the setRoomMaterial wall-branch in useAppStore.ts with the code below
 * 2. Remove <RoomWallSurfaces3D /> from Walls3D.tsx and InteractiveWalls3D.tsx
 * 3. Delete src/components/build/RoomWallSurfaces3D.tsx
 * 4. Remove wallMaterialId from Room type in types.ts (optional, field is harmless)
 */

// Original wall-branch code:
/*
  // For wall material: set per-side material on each wall of the room
  const floor = s.layout.floors.find((f: any) => f.id === floorId);
  if (!floor) return s;
  const room = floor.rooms.find((r: any) => r.id === roomId);
  if (!room || !room.polygon || room.polygon.length < 3) {
    return s;
  }

  // Use polygon winding to determine which side of each wall is interior
  const poly = room.polygon as [number, number][];
  // Compute signed area to determine winding (positive = CCW, negative = CW)
  let signedArea = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    signedArea += (poly[j][0] - poly[i][0]) * (poly[j][1] + poly[i][1]);
  }
  const isCW = signedArea > 0; // In our coordinate system: positive = CW

  const updatedWalls = floor.walls.map((w: any) => {
    if (!room.wallIds.includes(w.id)) return w;

    // Find this wall's edge in the polygon to determine traversal direction
    const EPS = 0.15;
    let wallMatchesPolyDir = true; // default
    for (let i = 0; i < poly.length; i++) {
      const j = (i + 1) % poly.length;
      const fromMatchesI = Math.abs(w.from[0] - poly[i][0]) < EPS && Math.abs(w.from[1] - poly[i][1]) < EPS;
      const toMatchesJ = Math.abs(w.to[0] - poly[j][0]) < EPS && Math.abs(w.to[1] - poly[j][1]) < EPS;
      const fromMatchesJ = Math.abs(w.from[0] - poly[j][0]) < EPS && Math.abs(w.from[1] - poly[j][1]) < EPS;
      const toMatchesI = Math.abs(w.to[0] - poly[i][0]) < EPS && Math.abs(w.to[1] - poly[i][1]) < EPS;
      if (fromMatchesI && toMatchesJ) { wallMatchesPolyDir = true; break; }
      if (fromMatchesJ && toMatchesI) { wallMatchesPolyDir = false; break; }
    }

    // For CW polygon: left normal of polygon-direction edge points inward
    // For CCW polygon: right normal of polygon-direction edge points inward
    // wall's "left" = left normal of wall.from→to
    // If wall matches polygon direction: interior = left for CW, right for CCW
    // If wall is reversed: interior = right for CW, left for CCW
    const interiorIsLeft = wallMatchesPolyDir ? !isCW : isCW;

    if (interiorIsLeft) {
      return { ...w, leftMaterialId: materialId };
    } else {
      return { ...w, rightMaterialId: materialId };
    }
  });

  return {
    layout: {
      ...s.layout,
      floors: s.layout.floors.map((f: any) =>
        f.id === floorId
          ? { ...f, walls: updatedWalls }
          : f
      ),
    },
  };
*/
