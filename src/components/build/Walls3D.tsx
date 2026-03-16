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

  // Texture params lookup (for direct wall painting only — room material handled by RoomWallSurfaces3D)
  const wallTexParams = useMemo(() => {
    const map: Record<string, { scale: number; rotation: number }> = {};
    for (const room of rooms) {
      for (const wid of room.wallIds) {
        if (!map[wid]) {
          map[wid] = { scale: room.wallTextureScale ?? 1, rotation: room.wallTextureRotation ?? 0 };
        }
      }
    }
    return map;
  }, [rooms]);

  const wallMeshes = useMemo(() =>
    walls.map((wall) => {
      const texParams = wallTexParams[wall.id];
      return (
        <group key={wall.id}>
          {generateWallSegments(wall, walls, elevation, {
            extraTextureScale: texParams?.scale,
            textureRotationDeg: texParams?.rotation,
          })}
        </group>
      );
    }), [walls, elevation, wallTexParams]);

  return (
    <group renderOrder={1}>
      {wallMeshes}
      <RoomWallSurfaces3D rooms={rooms} walls={walls} elevation={elevation} />
    </group>
  );
}
