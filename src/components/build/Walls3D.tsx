/**
 * Walls3D.tsx — Home-view (non-interactive) wall renderer.
 * Phase A1: Now delegates all geometry to shared wallGeometry.ts module.
 */

import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import RoomWallSurfaces3D from './RoomWallSurfaces3D';
import { generateWallSegments } from '../../lib/wallGeometry';

export default function Walls3D() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floor = floors.find((f) => f.id === activeFloorId);
  const walls = floor?.walls ?? [];
  const rooms = floor?.rooms ?? [];
  const elevation = floor?.elevation ?? 0;


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

  return (
    <group renderOrder={1}>
      {wallMeshes}
    </group>
  );
}
