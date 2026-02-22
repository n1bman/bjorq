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
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null);

  const selectedWallId = selection.type === 'wall' ? selection.id : null;

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
      
      // Use wall's own material, or room's wall material, or default
      const matId = wall.materialId || wallRoomMaterial[wall.id];
      const mat = matId ? getMaterialById(matId) : null;
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

          // ─── 3D Door/Window models ───
          const localX = op.offset * length - length / 2;
          const opCenterY = opBottom + op.height / 2;
          const opPos = new THREE.Vector3(localX, 0, 0)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
            .add(new THREE.Vector3(cx, opCenterY + elevation, cz));

          if (op.type === 'door') {
            // Door frame
            const frameThick = 0.04;
            // Left frame
            segments.push(
              <mesh key={`${wall.id}-door-fl-${i}`} position={[
                opPos.x + Math.cos(angle + Math.PI/2) * (op.width/2),
                opBottom + op.height / 2 + elevation,
                opPos.z - Math.sin(angle + Math.PI/2) * (op.width/2)
              ]} rotation={[0, -angle, 0]} castShadow>
                <boxGeometry args={[frameThick, op.height, wall.thickness + 0.02]} />
                <meshStandardMaterial color="#5a3a1a" roughness={0.6} />
              </mesh>
            );
            // Right frame
            segments.push(
              <mesh key={`${wall.id}-door-fr-${i}`} position={[
                opPos.x - Math.cos(angle + Math.PI/2) * (op.width/2),
                opBottom + op.height / 2 + elevation,
                opPos.z + Math.sin(angle + Math.PI/2) * (op.width/2)
              ]} rotation={[0, -angle, 0]} castShadow>
                <boxGeometry args={[frameThick, op.height, wall.thickness + 0.02]} />
                <meshStandardMaterial color="#5a3a1a" roughness={0.6} />
              </mesh>
            );
            // Top frame
            segments.push(
              <mesh key={`${wall.id}-door-ft-${i}`} position={[opPos.x, opBottom + op.height + elevation, opPos.z]}
                rotation={[0, -angle, 0]} castShadow>
                <boxGeometry args={[op.width + frameThick * 2, frameThick, wall.thickness + 0.02]} />
                <meshStandardMaterial color="#5a3a1a" roughness={0.6} />
              </mesh>
            );
            // Door panel (slightly offset)
            segments.push(
              <mesh key={`${wall.id}-door-panel-${i}`} position={[opPos.x, opBottom + op.height / 2 + elevation, opPos.z]}
                rotation={[0, -angle, 0]}>
                <boxGeometry args={[op.width - 0.04, op.height - 0.04, 0.04]} />
                <meshStandardMaterial color="#7a5a35" roughness={0.5} />
              </mesh>
            );
          } else {
            // Window frame
            const frameThick = 0.03;
            // Frame border (4 pieces)
            const halfW = op.width / 2;
            const halfH = op.height / 2;
            // Left
            segments.push(
              <mesh key={`${wall.id}-win-fl-${i}`} position={[
                opPos.x + Math.cos(angle + Math.PI/2) * halfW,
                opCenterY + elevation,
                opPos.z - Math.sin(angle + Math.PI/2) * halfW
              ]} rotation={[0, -angle, 0]}>
                <boxGeometry args={[frameThick, op.height, wall.thickness + 0.01]} />
                <meshStandardMaterial color="#d0d0d0" roughness={0.3} />
              </mesh>
            );
            // Right
            segments.push(
              <mesh key={`${wall.id}-win-fr-${i}`} position={[
                opPos.x - Math.cos(angle + Math.PI/2) * halfW,
                opCenterY + elevation,
                opPos.z + Math.sin(angle + Math.PI/2) * halfW
              ]} rotation={[0, -angle, 0]}>
                <boxGeometry args={[frameThick, op.height, wall.thickness + 0.01]} />
                <meshStandardMaterial color="#d0d0d0" roughness={0.3} />
              </mesh>
            );
            // Top
            segments.push(
              <mesh key={`${wall.id}-win-ft-${i}`} position={[opPos.x, opCenterY + halfH + elevation, opPos.z]}
                rotation={[0, -angle, 0]}>
                <boxGeometry args={[op.width, frameThick, wall.thickness + 0.01]} />
                <meshStandardMaterial color="#d0d0d0" roughness={0.3} />
              </mesh>
            );
            // Bottom
            segments.push(
              <mesh key={`${wall.id}-win-fb-${i}`} position={[opPos.x, opCenterY - halfH + elevation, opPos.z]}
                rotation={[0, -angle, 0]}>
                <boxGeometry args={[op.width, frameThick, wall.thickness + 0.01]} />
                <meshStandardMaterial color="#d0d0d0" roughness={0.3} />
              </mesh>
            );
            // Glass panel
            segments.push(
              <mesh key={`${wall.id}-win-glass-${i}`} position={[opPos.x, opCenterY + elevation, opPos.z]}
                rotation={[0, -angle, 0]}>
                <boxGeometry args={[op.width - 0.04, op.height - 0.04, 0.01]} />
                <meshStandardMaterial
                  color="#88ccff"
                  transparent
                  opacity={0.3}
                  roughness={0.05}
                  metalness={0.1}
                />
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
  }, [walls, rooms, elevation, selectedWallId, hoveredWallId, activeTool, handleWallClick, wallRoomMaterial]);

  return <group>{wallMeshes}</group>;
}
