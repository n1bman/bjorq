/**
 * InteractiveWalls3D.tsx — Build-mode interactive wall renderer.
 * Phase A1: Delegates geometry to shared wallGeometry.ts module.
 * Phase B2: Face-aware paint mode with visual face highlight.
 */

import { useMemo, useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { generateWallSegments, generateCornerBlocks, detectClickedFace } from '../../lib/wallGeometry';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

export default function InteractiveWalls3D() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const selection = useAppStore((s) => s.build.selection);
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setSelection = useAppStore((s) => s.setSelection);
  const updateWall = useAppStore((s) => s.updateWall);
  const pushUndo = useAppStore((s) => s.pushUndo);
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null);
  const [hoveredFaceSide, setHoveredFaceSide] = useState<'left' | 'right' | null>(null);

  const selectedWallId = selection.type === 'wall' ? selection.id : null;
  const selectedOpeningId = selection.type === 'opening' ? selection.id : null;
  const selectedFaceSide = selection.type === 'wall' ? selection.faceSide : null;

  const floor = floors.find((f) => f.id === activeFloorId);
  const walls = floor?.walls ?? [];
  const rooms = floor?.rooms ?? [];
  const elevation = floor?.elevation ?? 0;
  const isPaintMode = activeTool === 'paint';

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

    const wall = floors.find(f => f.id === activeFloorId)?.walls.find(w => w.id === wallId);
    if (!wall) return;

    // Detect which face was clicked
    const point = e.point;
    const faceSide = detectClickedFace(wall, [point.x, point.y, point.z], elevation);

    setSelection({ type: 'wall', id: wallId, faceSide });
  }, [activeTool, setSelection, floors, activeFloorId, elevation]);

  const handleWallHover = useCallback((e: ThreeEvent<PointerEvent>, wallId: string) => {
    if (!isPaintMode && activeTool !== 'select') return;
    setHoveredWallId(wallId);

    if (isPaintMode) {
      const wall = floors.find(f => f.id === activeFloorId)?.walls.find(w => w.id === wallId);
      if (wall) {
        const point = e.point;
        const side = detectClickedFace(wall, [point.x, point.y, point.z], elevation);
        setHoveredFaceSide(side);
      }
    }
  }, [isPaintMode, activeTool, floors, activeFloorId, elevation]);

  const handleWallHoverMove = useCallback((e: ThreeEvent<PointerEvent>, wallId: string) => {
    if (!isPaintMode) return;
    const wall = floors.find(f => f.id === activeFloorId)?.walls.find(w => w.id === wallId);
    if (wall) {
      const point = e.point;
      const side = detectClickedFace(wall, [point.x, point.y, point.z], elevation);
      setHoveredFaceSide(side);
    }
  }, [isPaintMode, floors, activeFloorId, elevation]);

  const handleOpeningClick = useCallback((e: ThreeEvent<PointerEvent>, openingId: string) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    setSelection({ type: 'opening', id: openingId });
  }, [activeTool, setSelection]);

  const wallMeshes = useMemo(() => {
    return walls.map((wall) => {
      const isSelected = wall.id === selectedWallId;
      const isHovered = wall.id === hoveredWallId;
      const highlightColor = isSelected ? '#4a9eff' : isHovered && !isPaintMode ? '#f0c060' : null;
      const emissive = isSelected ? '#1a3a6a' : isHovered && !isPaintMode ? '#3a2a10' : '#000000';
      const emissiveIntensity = (isSelected || (isHovered && !isPaintMode)) ? 0.3 : 0;

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

      // ─── Face highlight for paint mode ───
      let faceHighlight: JSX.Element | null = null;
      const showFaceSide = isPaintMode && isHovered && hoveredFaceSide
        ? hoveredFaceSide
        : isPaintMode && isSelected && selectedFaceSide
          ? selectedFaceSide
          : null;

      if (showFaceSide && (isHovered || isSelected)) {
        const dx = wall.to[0] - wall.from[0];
        const dz = wall.to[1] - wall.from[1];
        const wallLen = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);

        // Normal direction for the face
        const nx = -dz / wallLen;
        const nz = dx / wallLen;
        const sign = showFaceSide === 'left' ? 1 : -1;
        const offset = sign * (wall.thickness / 2 + 0.005); // slight offset to avoid z-fighting

        const midX = (wall.from[0] + wall.to[0]) / 2 + nx * offset;
        const midZ = (wall.from[1] + wall.to[1]) / 2 + nz * offset;
        const midY = wall.height / 2 + elevation;

        const isSelectedFace = isSelected && selectedFaceSide === showFaceSide;
        const highlightAlpha = isSelectedFace ? 0.25 : 0.15;
        const highlightCol = isSelectedFace ? '#4a9eff' : '#f0c060';

        faceHighlight = (
          <mesh
            key={`${wall.id}-face-hl`}
            position={[midX, midY, midZ]}
            rotation={[0, -angle, 0]}
            renderOrder={2}
          >
            <planeGeometry args={[wallLen, wall.height]} />
            <meshBasicMaterial
              color={highlightCol}
              transparent
              opacity={highlightAlpha}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        );
      }

      return (
        <group key={wall.id}
          onPointerDown={(e) => handleWallClick(e, wall.id)}
          onPointerEnter={(e) => handleWallHover(e, wall.id)}
          onPointerMove={(e) => handleWallHoverMove(e, wall.id)}
          onPointerLeave={() => { setHoveredWallId(null); setHoveredFaceSide(null); }}>
          {segments}
          {nodeElements}
          {faceHighlight}
        </group>
      );
    });
  }, [walls, rooms, elevation, selectedWallId, selectedFaceSide, selectedOpeningId, hoveredWallId, hoveredFaceSide, activeTool, isPaintMode, handleWallClick, handleWallHover, handleWallHoverMove, handleOpeningClick, wallRoomMaterial]);

  const cornerBlocks = useMemo(() =>
    generateCornerBlocks(walls, elevation, {
      fallbackMaterialMap: wallRoomMaterial,
    }),
    [walls, elevation, wallRoomMaterial]);

  return <group renderOrder={1}>{wallMeshes}{cornerBlocks}</group>;
}
