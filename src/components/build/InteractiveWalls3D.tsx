/**
 * InteractiveWalls3D.tsx — Build-mode interactive wall renderer.
 * Phase A1: Delegates geometry to shared wallGeometry.ts module.
 * Phase B2: Face-aware paint mode with visual face highlight.
 * Phase C1: Wall-mount placement — clicking a wall places a mounted object.
 */

import { useMemo, useState, useCallback } from 'react';
import RoomWallSurfaces3D from './RoomWallSurfaces3D';
import { useAppStore } from '../../store/useAppStore';
import { generateWallSegments, detectClickedFace } from '../../lib/wallGeometry';
import { clickToWallMount, computeWallMountTransform } from '../../lib/wallMountPlacement';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { toast } from 'sonner';

const generateId = () => Math.random().toString(36).slice(2, 10);

export default function InteractiveWalls3D() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const selection = useAppStore((s) => s.build.selection);
  const activeTool = useAppStore((s) => s.build.activeTool);
  const pendingWallMount = useAppStore((s) => s.build.pendingWallMount);
  const setSelection = useAppStore((s) => s.setSelection);
  const updateWall = useAppStore((s) => s.updateWall);
  const pushUndo = useAppStore((s) => s.pushUndo);
  const addProp = useAppStore((s) => s.addProp);
  const setPendingWallMount = useAppStore((s) => s.setPendingWallMount);
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null);
  const [hoveredFaceSide, setHoveredFaceSide] = useState<'left' | 'right' | null>(null);
  const [mountPreviewPos, setMountPreviewPos] = useState<[number, number, number] | null>(null);

  const selectedWallId = selection.type === 'wall' ? selection.id : null;
  const selectedOpeningId = selection.type === 'opening' ? selection.id : null;
  const selectedFaceSide = selection.type === 'wall' ? selection.faceSide : null;

  const floor = floors.find((f) => f.id === activeFloorId);
  const walls = floor?.walls ?? [];
  const rooms = floor?.rooms ?? [];
  const elevation = floor?.elevation ?? 0;
  const isPaintMode = activeTool === 'paint';
  const isWallMountMode = !!pendingWallMount;


  const editLock = useAppStore((s) => s.build.editLock ?? 'all');

  const handleWallClick = useCallback((e: ThreeEvent<PointerEvent>, wallId: string) => {
    // ─── Phase C1: Wall-mount placement ───
    if (isWallMountMode && pendingWallMount) {
      e.stopPropagation();
      const wall = floors.find(f => f.id === activeFloorId)?.walls.find(w => w.id === wallId);
      if (!wall || !activeFloorId) return;

      const point = e.point;
      const mountInfo = clickToWallMount(wall, [point.x, point.y, point.z], elevation);
      const transform = computeWallMountTransform(wall, mountInfo.faceSide, mountInfo.offsetAlongWall, mountInfo.heightOnWall, elevation);

      addProp({
        id: generateId(),
        catalogId: pendingWallMount.catalogId,
        floorId: activeFloorId,
        url: pendingWallMount.url,
        position: transform.position,
        rotation: transform.rotation,
        scale: [1, 1, 1],
        wallMountInfo: mountInfo,
      });

      setPendingWallMount(null);
      setMountPreviewPos(null);
      toast.success('Väggmonterad');
      return;
    }

    if (activeTool !== 'select' && activeTool !== 'paint') return;
    if (editLock !== 'all' && editLock !== 'walls') return;
    e.stopPropagation();

    const wall = floors.find(f => f.id === activeFloorId)?.walls.find(w => w.id === wallId);
    if (!wall) return;

    // Detect which face was clicked
    const point = e.point;
    const faceSide = detectClickedFace(wall, [point.x, point.y, point.z], elevation);

    setSelection({ type: 'wall', id: wallId, faceSide });
  }, [activeTool, setSelection, floors, activeFloorId, elevation, isWallMountMode, pendingWallMount, addProp, setPendingWallMount, editLock]);

  const handleWallHover = useCallback((e: ThreeEvent<PointerEvent>, wallId: string) => {
    if (!isPaintMode && activeTool !== 'select' && !isWallMountMode) return;
    setHoveredWallId(wallId);

    if (isPaintMode || isWallMountMode) {
      const wall = floors.find(f => f.id === activeFloorId)?.walls.find(w => w.id === wallId);
      if (wall) {
        const point = e.point;
        const side = detectClickedFace(wall, [point.x, point.y, point.z], elevation);
        setHoveredFaceSide(side);
        if (isWallMountMode) {
          setMountPreviewPos([point.x, point.y, point.z]);
        }
      }
    }
  }, [isPaintMode, activeTool, floors, activeFloorId, elevation, isWallMountMode]);

  const handleWallHoverMove = useCallback((e: ThreeEvent<PointerEvent>, wallId: string) => {
    if (!isPaintMode && !isWallMountMode) return;
    const wall = floors.find(f => f.id === activeFloorId)?.walls.find(w => w.id === wallId);
    if (wall) {
      const point = e.point;
      const side = detectClickedFace(wall, [point.x, point.y, point.z], elevation);
      setHoveredFaceSide(side);
      if (isWallMountMode) {
        setMountPreviewPos([point.x, point.y, point.z]);
      }
    }
  }, [isPaintMode, floors, activeFloorId, elevation, isWallMountMode]);

  const handleOpeningClick = useCallback((e: ThreeEvent<PointerEvent>, openingId: string) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    setSelection({ type: 'opening', id: openingId });
  }, [activeTool, setSelection]);

  const wallMeshes = useMemo(() => {
    return walls.map((wall) => {
      const isSelected = wall.id === selectedWallId;
      const isHovered = wall.id === hoveredWallId;
      // Match floor highlight style: subtle emissive + no color override for selection
      const emissive = isSelected ? '#1a3a6a' : isHovered && !isPaintMode && !isWallMountMode ? '#3a2a10' : '#000000';
      const emissiveIntensity = isSelected ? 0.08 : (isHovered && !isPaintMode && !isWallMountMode) ? 0.15 : 0;

      const segments = generateWallSegments(wall, walls, elevation, {
        // No highlightColor override — preserve real material like floors
        highlightColor: null,
        emissive,
        emissiveIntensity,
        onOpeningClick: handleOpeningClick,
        selectedOpeningId,
        includeWindowReveal: true,
      });

      // Selection outline for walls (matching floor outline style)
      let outlineElements: JSX.Element | null = null;
      if (isSelected) {
        const dx = wall.to[0] - wall.from[0];
        const dz = wall.to[1] - wall.from[1];
        const wallLen = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        const nx = -dz / wallLen;
        const nz = dx / wallLen;
        const ht = wall.thickness / 2;

        // Build outline rectangle around wall perimeter
        const outlinePoints = [
          new THREE.Vector3(wall.from[0] + nx * ht, elevation, wall.from[1] + nz * ht),
          new THREE.Vector3(wall.to[0] + nx * ht, elevation, wall.to[1] + nz * ht),
          new THREE.Vector3(wall.to[0] + nx * ht, elevation + wall.height, wall.to[1] + nz * ht),
          new THREE.Vector3(wall.from[0] + nx * ht, elevation + wall.height, wall.from[1] + nz * ht),
          new THREE.Vector3(wall.from[0] + nx * ht, elevation, wall.from[1] + nz * ht),
        ];
        const outlinePoints2 = [
          new THREE.Vector3(wall.from[0] - nx * ht, elevation, wall.from[1] - nz * ht),
          new THREE.Vector3(wall.to[0] - nx * ht, elevation, wall.to[1] - nz * ht),
          new THREE.Vector3(wall.to[0] - nx * ht, elevation + wall.height, wall.to[1] - nz * ht),
          new THREE.Vector3(wall.from[0] - nx * ht, elevation + wall.height, wall.from[1] - nz * ht),
          new THREE.Vector3(wall.from[0] - nx * ht, elevation, wall.from[1] - nz * ht),
        ];
        const geo1 = new THREE.BufferGeometry().setFromPoints(outlinePoints);
        const geo2 = new THREE.BufferGeometry().setFromPoints(outlinePoints2);
        const outlineMat = new THREE.LineBasicMaterial({ color: '#4a9eff', depthTest: false, transparent: true, opacity: 0.9 });
        outlineElements = (
          <>
            <primitive object={new THREE.LineLoop(geo1, outlineMat)} />
            <primitive object={new THREE.LineLoop(geo2, outlineMat.clone())} />
          </>
        );
      }

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

      // ─── Face highlight for paint mode or wall-mount mode ───
      let faceHighlight: JSX.Element | null = null;
      const showFaceSide =
        (isPaintMode || isWallMountMode) && isHovered && hoveredFaceSide
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
        // Phase C1: use soft blue for wall-mount mode, orange/blue for paint
        const highlightAlpha = isWallMountMode ? 0.2 : (isSelectedFace ? 0.25 : 0.15);
        const highlightCol = isWallMountMode ? '#4a9eff' : (isSelectedFace ? '#4a9eff' : '#f0c060');

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
          onPointerLeave={() => { setHoveredWallId(null); setHoveredFaceSide(null); setMountPreviewPos(null); }}>
          {segments}
          {nodeElements}
          {faceHighlight}
          {outlineElements}
        </group>
      );
    });
  }, [walls, rooms, elevation, selectedWallId, selectedFaceSide, selectedOpeningId, hoveredWallId, hoveredFaceSide, activeTool, isPaintMode, isWallMountMode, handleWallClick, handleWallHover, handleWallHoverMove, handleOpeningClick, wallRoomMaterial, wallRoomTextureParams]);

  return (
    <group renderOrder={1}>
      {wallMeshes}
      {/* Phase C1: Mount placement preview dot */}
      {isWallMountMode && mountPreviewPos && (
        <mesh position={mountPreviewPos} renderOrder={10}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#4a9eff" transparent opacity={0.8} depthTest={false} />
        </mesh>
      )}
    </group>
  );
}
