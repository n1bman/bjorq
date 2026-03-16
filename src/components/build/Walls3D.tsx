/**
 * Walls3D.tsx — Home-view (non-interactive) wall renderer.
 * Phase A1: Now delegates all geometry to shared wallGeometry.ts module.
 */

import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { generateWallSegments } from '../../lib/wallGeometry';

export default function Walls3D() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floor = floors.find((f) => f.id === activeFloorId);
  const walls = floor?.walls ?? [];
  const rooms = floor?.rooms ?? [];
  const elevation = floor?.elevation ?? 0;

  // Build wall-to-room material + texture params lookup
  const wallRoomData = useMemo(() => {
    const matMap: Record<string, string> = {};
    const texMap: Record<string, { scale: number; rotation: number }> = {};
    for (const room of rooms) {
      if (room.wallMaterialId) {
        for (const wid of room.wallIds) {
          if (!matMap[wid]) matMap[wid] = room.wallMaterialId;
        }
      }
      for (const wid of room.wallIds) {
        if (!texMap[wid]) {
          texMap[wid] = { scale: room.wallTextureScale ?? 1, rotation: room.wallTextureRotation ?? 0 };
        }
      }
    }
    return { matMap, texMap };
  }, [rooms]);

  const wallMeshes = useMemo(() =>
    walls.map((wall) => {
      const texParams = wallRoomData.texMap[wall.id];
      return (
        <group key={wall.id}>
          {generateWallSegments(wall, walls, elevation, {
            fallbackMaterialId: wallRoomData.matMap[wall.id],
            extraTextureScale: texParams?.scale,
            textureRotationDeg: texParams?.rotation,
          })}
        </group>
      );
    }), [walls, elevation, wallRoomData]);

  return <group renderOrder={1}>{wallMeshes}</group>;
}
