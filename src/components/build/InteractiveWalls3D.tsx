import { useMemo, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getMaterialById } from '@/lib/materials';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';

export default function InteractiveWalls3D() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const selection = useAppStore((s) => s.build.selection);
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setSelection = useAppStore((s) => s.setSelection);
  const updateWallNode = useAppStore((s) => s.updateWallNode);
  const pushUndo = useAppStore((s) => s.pushUndo);
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null);

  const selectedWallId = selection.type === 'wall' ? selection.id : null;

  const floor = floors.find((f) => f.id === activeFloorId);
  const walls = floor?.walls ?? [];
  const elevation = floor?.elevation ?? 0;

  const handleWallClick = useCallback((e: ThreeEvent<PointerEvent>, wallId: string) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    setSelection({ type: 'wall', id: wallId });
  }, [activeTool, setSelection]);

  const wallMeshes = useMemo(() => {
    return walls.map((wall) => {
      const dx = wall.to[0] - wall.from[0];
      const dz = wall.to[1] - wall.from[1];
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      const cx = (wall.from[0] + wall.to[0]) / 2;
      const cz = (wall.from[1] + wall.to[1]) / 2;
      const mat = wall.materialId ? getMaterialById(wall.materialId) : null;
      const baseColor = mat?.color ?? '#e8a845';

      const isSelected = wall.id === selectedWallId;
      const isHovered = wall.id === hoveredWallId;
      const color = isSelected ? '#4a9eff' : isHovered ? '#f0c060' : baseColor;

      const segments: JSX.Element[] = [];

      if (wall.openings.length === 0) {
        segments.push(
          <mesh key={`${wall.id}-solid`} position={[cx, wall.height / 2 + elevation, cz]}
            rotation={[0, -angle, 0]} castShadow receiveShadow>
            <boxGeometry args={[length, wall.height, wall.thickness]} />
            <meshStandardMaterial color={color} roughness={mat?.roughness ?? 0.8}
              emissive={isSelected ? '#1a3a6a' : isHovered ? '#3a2a10' : '#000000'}
              emissiveIntensity={isSelected || isHovered ? 0.3 : 0} />
          </mesh>
        );
      } else {
        const sortedOpenings = [...wall.openings].sort((a, b) => a.offset - b.offset);
        let cursor = 0;

        sortedOpenings.forEach((op, i) => {
          const opStart = op.offset * length - op.width / 2;
          const opEnd = op.offset * length + op.width / 2;
          const opBottom = op.type === 'window' ? (op.sillHeight ?? (wall.height - op.height) / 2) : 0;
          const opTop = opBottom + op.height;

          if (opStart > cursor) {
            const segLen = opStart - cursor;
            const segCenter = cursor + segLen / 2;
            const localX = segCenter - length / 2;
            const pos = new THREE.Vector3(localX, 0, 0)
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
              .add(new THREE.Vector3(cx, wall.height / 2 + elevation, cz));
            segments.push(
              <mesh key={`${wall.id}-seg-${i}-pre`} position={pos.toArray()} rotation={[0, -angle, 0]} castShadow>
                <boxGeometry args={[segLen, wall.height, wall.thickness]} />
                <meshStandardMaterial color={color} roughness={mat?.roughness ?? 0.8}
                  emissive={isSelected ? '#1a3a6a' : '#000000'} emissiveIntensity={isSelected ? 0.3 : 0} />
              </mesh>
            );
          }

          if (opTop < wall.height) {
            const aboveH = wall.height - opTop;
            const localX = op.offset * length - length / 2;
            const pos = new THREE.Vector3(localX, 0, 0)
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
              .add(new THREE.Vector3(cx, opTop + aboveH / 2 + elevation, cz));
            segments.push(
              <mesh key={`${wall.id}-seg-${i}-above`} position={pos.toArray()} rotation={[0, -angle, 0]} castShadow>
                <boxGeometry args={[op.width, aboveH, wall.thickness]} />
                <meshStandardMaterial color={color} roughness={mat?.roughness ?? 0.8}
                  emissive={isSelected ? '#1a3a6a' : '#000000'} emissiveIntensity={isSelected ? 0.3 : 0} />
              </mesh>
            );
          }

          if (opBottom > 0) {
            const localX = op.offset * length - length / 2;
            const pos = new THREE.Vector3(localX, 0, 0)
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
              .add(new THREE.Vector3(cx, opBottom / 2 + elevation, cz));
            segments.push(
              <mesh key={`${wall.id}-seg-${i}-below`} position={pos.toArray()} rotation={[0, -angle, 0]} castShadow>
                <boxGeometry args={[op.width, opBottom, wall.thickness]} />
                <meshStandardMaterial color={color} roughness={mat?.roughness ?? 0.8}
                  emissive={isSelected ? '#1a3a6a' : '#000000'} emissiveIntensity={isSelected ? 0.3 : 0} />
              </mesh>
            );
          }

          cursor = opEnd;
        });

        if (cursor < length) {
          const segLen = length - cursor;
          const segCenter = cursor + segLen / 2;
          const localX = segCenter - length / 2;
          const pos = new THREE.Vector3(localX, 0, 0)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
            .add(new THREE.Vector3(cx, wall.height / 2 + elevation, cz));
          segments.push(
            <mesh key={`${wall.id}-seg-last`} position={pos.toArray()} rotation={[0, -angle, 0]} castShadow>
              <boxGeometry args={[segLen, wall.height, wall.thickness]} />
              <meshStandardMaterial color={color} roughness={mat?.roughness ?? 0.8}
                emissive={isSelected ? '#1a3a6a' : '#000000'} emissiveIntensity={isSelected ? 0.3 : 0} />
            </mesh>
          );
        }
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
  }, [walls, elevation, selectedWallId, hoveredWallId, activeTool, handleWallClick]);

  return <group>{wallMeshes}</group>;
}
