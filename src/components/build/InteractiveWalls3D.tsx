import { useMemo, useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getMaterialById } from '../../lib/materials';
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

          // ─── 3D Door/Window/Garage models ───
          const localX = op.offset * length - length / 2;
          const opCenterY = opBottom + op.height / 2;
          const opPos = new THREE.Vector3(localX, 0, 0)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
            .add(new THREE.Vector3(cx, opCenterY + elevation, cz));

          const frameW = 0.04; // frame bar width
          const frameDepth = 0.06;
          const frameColor = op.type === 'garage-door' ? '#6a6a6a' : '#c0c0c0';

          if (op.type === 'door') {
            const isDouble = op.style === 'double';
            const isSliding = op.style === 'sliding';
            const panelW = isDouble ? (op.width - 0.04) / 2 : op.width - 0.04;

            // Door frame – top
            segments.push(
              <mesh key={`${wall.id}-door-ft-${i}`} position={[opPos.x, opBottom + op.height - frameW / 2 + elevation, opPos.z]}
                rotation={[0, -angle, 0]} castShadow>
                <boxGeometry args={[op.width, frameW, frameDepth]} />
                <meshStandardMaterial color={frameColor} roughness={0.3} />
              </mesh>
            );
            // Door frame – left
            segments.push(
              <mesh key={`${wall.id}-door-fl-${i}`} position={new THREE.Vector3(localX - op.width / 2 + frameW / 2, 0, 0)
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                .add(new THREE.Vector3(cx, opBottom + op.height / 2 + elevation, cz)).toArray()}
                rotation={[0, -angle, 0]} castShadow>
                <boxGeometry args={[frameW, op.height, frameDepth]} />
                <meshStandardMaterial color={frameColor} roughness={0.3} />
              </mesh>
            );
            // Door frame – right
            segments.push(
              <mesh key={`${wall.id}-door-fr-${i}`} position={new THREE.Vector3(localX + op.width / 2 - frameW / 2, 0, 0)
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                .add(new THREE.Vector3(cx, opBottom + op.height / 2 + elevation, cz)).toArray()}
                rotation={[0, -angle, 0]} castShadow>
                <boxGeometry args={[frameW, op.height, frameDepth]} />
                <meshStandardMaterial color={frameColor} roughness={0.3} />
              </mesh>
            );

            // Door panel(s)
            if (isDouble) {
              // Left panel
              segments.push(
                <mesh key={`${wall.id}-door-pl-${i}`} position={new THREE.Vector3(localX - panelW / 2 - 0.01, 0, 0)
                  .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                  .add(new THREE.Vector3(cx, opBottom + op.height / 2 + elevation, cz)).toArray()}
                  rotation={[0, -angle, 0]}>
                  <boxGeometry args={[panelW, op.height - 0.06, 0.04]} />
                  <meshStandardMaterial color="#7a5a35" roughness={0.5} />
                </mesh>
              );
              // Right panel
              segments.push(
                <mesh key={`${wall.id}-door-pr-${i}`} position={new THREE.Vector3(localX + panelW / 2 + 0.01, 0, 0)
                  .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                  .add(new THREE.Vector3(cx, opBottom + op.height / 2 + elevation, cz)).toArray()}
                  rotation={[0, -angle, 0]}>
                  <boxGeometry args={[panelW, op.height - 0.06, 0.04]} />
                  <meshStandardMaterial color="#7a5a35" roughness={0.5} />
                </mesh>
              );
            } else {
              // Single panel (offset to one side for sliding)
              const panelOffset = isSliding ? -0.15 : 0;
              segments.push(
                <mesh key={`${wall.id}-door-panel-${i}`} position={new THREE.Vector3(localX + panelOffset, 0, 0)
                  .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                  .add(new THREE.Vector3(cx, opBottom + op.height / 2 + elevation, cz)).toArray()}
                  rotation={[0, -angle, 0]}>
                  <boxGeometry args={[panelW, op.height - 0.06, 0.04]} />
                  <meshStandardMaterial color={isSliding ? '#5a4a3a' : '#7a5a35'} roughness={0.5} />
                </mesh>
              );
              // Sliding door rail
              if (isSliding) {
                segments.push(
                  <mesh key={`${wall.id}-door-rail-${i}`} position={[opPos.x, opBottom + op.height - 0.02 + elevation, opPos.z]}
                    rotation={[0, -angle, 0]}>
                    <boxGeometry args={[op.width + 0.1, 0.02, 0.03]} />
                    <meshStandardMaterial color="#888" roughness={0.3} metalness={0.5} />
                  </mesh>
                );
              }
            }

            // Door handle
            segments.push(
              <mesh key={`${wall.id}-door-handle-${i}`} position={new THREE.Vector3(localX + (isDouble ? 0 : panelW * 0.35), 0, 0)
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                .add(new THREE.Vector3(cx, opBottom + 1.0 + elevation, cz)).toArray()}
                rotation={[0, -angle, 0]}>
                <boxGeometry args={[0.12, 0.03, 0.05]} />
                <meshStandardMaterial color="#aaa" roughness={0.2} metalness={0.7} />
              </mesh>
            );
          } else if (op.type === 'window') {
            const isFrench = op.style === 'french';
            const isFixed = op.style === 'fixed';
            const hasMullion = !isFixed && op.width > 1.0;

            // Glass panel
            segments.push(
              <mesh key={`${wall.id}-win-glass-${i}`} position={[opPos.x, opCenterY + elevation, opPos.z]}
                rotation={[0, -angle, 0]}>
                <boxGeometry args={[op.width - 0.06, op.height - 0.06, 0.008]} />
                <meshStandardMaterial color="#88ccff" transparent opacity={isFrench ? 0.35 : 0.3}
                  roughness={0.05} metalness={0.1} />
              </mesh>
            );

            // Full frame (4 bars)
            const bars: [string, number[], number[]][] = [
              ['top', [opPos.x, opCenterY + op.height / 2 - frameW / 2 + elevation, opPos.z], [op.width, frameW, 0.03]],
              ['bottom', [opPos.x, opCenterY - op.height / 2 + frameW / 2 + elevation, opPos.z], [op.width, frameW, 0.03]],
            ];
            // Left bar
            const leftPos = new THREE.Vector3(localX - op.width / 2 + frameW / 2, 0, 0)
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
              .add(new THREE.Vector3(cx, opCenterY + elevation, cz));
            bars.push(['left', leftPos.toArray(), [frameW, op.height, 0.03]]);
            const rightPos = new THREE.Vector3(localX + op.width / 2 - frameW / 2, 0, 0)
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
              .add(new THREE.Vector3(cx, opCenterY + elevation, cz));
            bars.push(['right', rightPos.toArray(), [frameW, op.height, 0.03]]);

            // Vertical mullion for wide windows
            if (hasMullion) {
              bars.push(['mullion', [opPos.x, opCenterY + elevation, opPos.z], [frameW * 0.7, op.height - 0.06, 0.025]]);
            }

            for (const [key, pos, dims] of bars) {
              segments.push(
                <mesh key={`${wall.id}-win-f${key}-${i}`} position={pos as [number, number, number]}
                  rotation={[0, -angle, 0]} castShadow>
                  <boxGeometry args={dims as [number, number, number]} />
                  <meshStandardMaterial color={frameColor} roughness={0.3} />
                </mesh>
              );
            }

            // Window sill
            if (!isFrench) {
              segments.push(
                <mesh key={`${wall.id}-win-sill-${i}`} position={[opPos.x, opCenterY - op.height / 2 - 0.02 + elevation, opPos.z]}
                  rotation={[0, -angle, 0]} castShadow>
                  <boxGeometry args={[op.width + 0.08, 0.03, wall.thickness + 0.06]} />
                  <meshStandardMaterial color="#e0e0e0" roughness={0.6} />
                </mesh>
              );
            }
          } else if (op.type === 'garage-door') {
            // Garage door panel with horizontal sections
            const sections = 4;
            const sectionH = (op.height - 0.04) / sections;
            for (let s = 0; s < sections; s++) {
              const sy = opBottom + 0.02 + sectionH * s + sectionH / 2;
              segments.push(
                <mesh key={`${wall.id}-garage-sec-${i}-${s}`} position={new THREE.Vector3(localX, 0, 0)
                  .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                  .add(new THREE.Vector3(cx, sy + elevation, cz)).toArray()}
                  rotation={[0, -angle, 0]}>
                  <boxGeometry args={[op.width - 0.06, sectionH - 0.02, 0.04]} />
                  <meshStandardMaterial color="#b0b0b0" roughness={0.7} metalness={0.2} />
                </mesh>
              );
            }

            // Garage door frame
            const gFrameW = 0.05;
            // Top
            segments.push(
              <mesh key={`${wall.id}-garage-ft-${i}`} position={[opPos.x, opBottom + op.height - gFrameW / 2 + elevation, opPos.z]}
                rotation={[0, -angle, 0]} castShadow>
                <boxGeometry args={[op.width, gFrameW, 0.07]} />
                <meshStandardMaterial color="#555" roughness={0.4} metalness={0.3} />
              </mesh>
            );
            // Left
            segments.push(
              <mesh key={`${wall.id}-garage-fl-${i}`} position={new THREE.Vector3(localX - op.width / 2 + gFrameW / 2, 0, 0)
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                .add(new THREE.Vector3(cx, opBottom + op.height / 2 + elevation, cz)).toArray()}
                rotation={[0, -angle, 0]} castShadow>
                <boxGeometry args={[gFrameW, op.height, 0.07]} />
                <meshStandardMaterial color="#555" roughness={0.4} metalness={0.3} />
              </mesh>
            );
            // Right
            segments.push(
              <mesh key={`${wall.id}-garage-fr-${i}`} position={new THREE.Vector3(localX + op.width / 2 - gFrameW / 2, 0, 0)
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                .add(new THREE.Vector3(cx, opBottom + op.height / 2 + elevation, cz)).toArray()}
                rotation={[0, -angle, 0]}>
                <boxGeometry args={[gFrameW, op.height, 0.07]} />
                <meshStandardMaterial color="#555" roughness={0.4} metalness={0.3} />
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
