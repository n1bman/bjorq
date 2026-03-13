/**
 * InteractiveWalls3D.tsx — Build-mode interactive wall renderer.
 * Phase A1: Now delegates geometry to shared wallGeometry.ts module.
 * Keeps: selection/hover state, event handlers, node spheres, room material lookup.
 */

import { useMemo, useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { generateWallSegments, generateCornerBlocks } from '../../lib/wallGeometry';
import { ThreeEvent } from '@react-three/fiber';

export default function InteractiveWalls3D() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const selection = useAppStore((s) => s.build.selection);
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setSelection = useAppStore((s) => s.setSelection);
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null);

  const selectedWallId = selection.type === 'wall' ? selection.id : null;
  const selectedOpeningId = selection.type === 'opening' ? selection.id : null;

  const floor = floors.find((f) => f.id === activeFloorId);
  const walls = floor?.walls ?? [];
  const rooms = floor?.rooms ?? [];
  const elevation = floor?.elevation ?? 0;

  // Build wall-to-room material lookup
  const wallRoomMaterial = useMemo(() => {
    const map: Record<string, string> = {};
    for (const room of rooms) {
      if (room.wallMaterialId) {
        for (const wid of room.wallIds) {
          if (!map[wid]) map[wid] = room.wallMaterialId;
        }
      }
    }
    return map;
  }, [rooms]);

  const handleWallClick = useCallback((e: ThreeEvent<PointerEvent>, wallId: string) => {
    if (activeTool !== 'select' && activeTool !== 'paint') return;
    e.stopPropagation();
    setSelection({ type: 'wall', id: wallId });
  }, [activeTool, setSelection]);

  const handleOpeningClick = useCallback((e: ThreeEvent<PointerEvent>, openingId: string) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    setSelection({ type: 'opening', id: openingId });
  }, [activeTool, setSelection]);

  const wallMeshes = useMemo(() => {
    return walls.map((wall) => {
      const isSelected = wall.id === selectedWallId;
      const isHovered = wall.id === hoveredWallId;
      const highlightColor = isSelected ? '#4a9eff' : isHovered ? '#f0c060' : null;
      const emissive = isSelected ? '#1a3a6a' : isHovered ? '#3a2a10' : '#000000';
      const emissiveIntensity = isSelected || isHovered ? 0.3 : 0;

      const segments = generateWallSegments(wall, walls, elevation, {
        fallbackMaterialId: wallRoomMaterial[wall.id],
        highlightColor,
        emissive,
        emissiveIntensity,
        onOpeningClick: handleOpeningClick,
        selectedOpeningId,
        includeWindowReveal: true,
      });

      const nodeElements = activeTool === 'select' ? (
        <>
          <mesh position={[wall.from[0], 0.15 + elevation, wall.from[1]]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color={isSelected ? '#4a9eff' : '#e8a845'}
              emissive={isSelected ? '#4a9eff' : '#e8a845'} emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[wall.to[0], 0.15 + elevation, wall.to[1]]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color={isSelected ? '#4a9eff' : '#e8a845'}
              emissive={isSelected ? '#4a9eff' : '#e8a845'} emissiveIntensity={0.4} />
          </mesh>
        </>
      ) : null;

      return (
        <group key={wall.id}
          onPointerDown={(e) => handleWallClick(e, wall.id)}
          onPointerEnter={() => activeTool === 'select' && setHoveredWallId(wall.id)}
          onPointerLeave={() => setHoveredWallId(null)}>
          {segments}
          {nodeElements}
        </group>
      );
    });
  }, [walls, rooms, elevation, selectedWallId, selectedOpeningId, hoveredWallId, activeTool, handleWallClick, handleOpeningClick, wallRoomMaterial]);

  const cornerBlocks = useMemo(() =>
    generateCornerBlocks(walls, elevation, {
      fallbackMaterialMap: wallRoomMaterial,
    }),
    [walls, elevation, wallRoomMaterial]);

  return <group renderOrder={1}>{wallMeshes}{cornerBlocks}</group>;
}
