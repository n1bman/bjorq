/**
 * Walls3D.tsx — Home-view (non-interactive) wall renderer.
 * Phase A1: Delegates all geometry to shared wallGeometry.ts module.
 * Room wall finish via RoomWallSurfaces3D additive layer.
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
    walls.map((wall) => (
      <group key={wall.id}>
        {generateWallSegments(wall, walls, elevation)}
      </group>
    )), [walls, elevation]);

  return (
    <group renderOrder={1}>
      {wallMeshes}
      <RoomWallSurfaces3D rooms={rooms} walls={walls} elevation={elevation} />
    </group>
  );
}
