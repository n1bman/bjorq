/**
 * Walls3D.tsx — Home-view (non-interactive) wall renderer.
 * Phase A1: Now delegates all geometry to shared wallGeometry.ts module.
 */

import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { generateWallSegments, generateCornerBlocks } from '../../lib/wallGeometry';

export default function Walls3D() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floor = floors.find((f) => f.id === activeFloorId);
  const walls = floor?.walls ?? [];
  const elevation = floor?.elevation ?? 0;

  const wallMeshes = useMemo(() =>
    walls.map((wall) => (
      <group key={wall.id}>
        {generateWallSegments(wall, walls, elevation)}
      </group>
    )), [walls, elevation]);

  const cornerBlocks = useMemo(() =>
    generateCornerBlocks(walls, elevation, { polygonOffset: true }),
    [walls, elevation]);

  return <group renderOrder={1}>{wallMeshes}{cornerBlocks}</group>;
}
