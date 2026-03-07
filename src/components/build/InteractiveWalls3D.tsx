import { useMemo, useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getMaterialById } from '../../lib/materials';
import { createWallMaterials, resolveWallColors } from '../../lib/wallMaterials';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';

/* ── Helper: check if a wall endpoint connects to another wall ── */
function getConnectedAtEndpoint(
  walls: { from: [number, number]; to: [number, number]; thickness: number; id: string }[],
  wallId: string,
  point: [number, number],
  eps = 0.05,
): number {
  let maxThickness = 0;
  for (const w of walls) {
    if (w.id === wallId) continue;
    const df = Math.abs(w.from[0] - point[0]) + Math.abs(w.from[1] - point[1]);
    const dt = Math.abs(w.to[0] - point[0]) + Math.abs(w.to[1] - point[1]);
    if (df < eps || dt < eps) {
      maxThickness = Math.max(maxThickness, w.thickness);
    }
  }
  return maxThickness;
}

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
      const dx = wall.to[0] - wall.from[0];
      const dz = wall.to[1] - wall.from[1];
      const origLength = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      const origCx = (wall.from[0] + wall.to[0]) / 2;
      const origCz = (wall.from[1] + wall.to[1]) / 2;

      // ── Wall corner mitering ──
      const fromConn = getConnectedAtEndpoint(walls, wall.id, wall.from);
      const toConn = getConnectedAtEndpoint(walls, wall.id, wall.to);
      // Use the larger of connected thickness or own thickness for clean corners
      const trimFrom = fromConn > 0 ? Math.max(fromConn, wall.thickness) / 2 : 0;
      const trimTo = toConn > 0 ? Math.max(toConn, wall.thickness) / 2 : 0;

      let length = origLength;
      let cx = origCx;
      let cz = origCz;

      if (trimFrom > 0 || trimTo > 0) {
        const totalTrim = trimFrom + trimTo;
        if (totalTrim < length) {
          const dir = new THREE.Vector2(dx, dz).normalize();
          const newFrom: [number, number] = [wall.from[0] + dir.x * trimFrom, wall.from[1] + dir.y * trimFrom];
          const newTo: [number, number] = [wall.to[0] - dir.x * trimTo, wall.to[1] - dir.y * trimTo];
          length = origLength - totalTrim;
          cx = (newFrom[0] + newTo[0]) / 2;
          cz = (newFrom[1] + newTo[1]) / 2;
        }
      }
      
      // Resolve dual materials (exterior / interior)
      const fallbackMatId = wallRoomMaterial[wall.id];
      const wallColors = resolveWallColors(wall, fallbackMatId);

      const isSelected = wall.id === selectedWallId;
      const isHovered = wall.id === hoveredWallId;
      const highlightColor = isSelected ? '#4a9eff' : isHovered ? '#f0c060' : null;
      const emissive = isSelected ? '#1a3a6a' : isHovered ? '#3a2a10' : '#000000';
      const emissiveIntensity = isSelected || isHovered ? 0.3 : 0;

      const segments: JSX.Element[] = [];

      // Create dual-sided material array for solid wall segments
      const dualMats = highlightColor
        ? createWallMaterials({ ...wallColors, exteriorColor: highlightColor, interiorColor: highlightColor, edgeColor: highlightColor, emissive, emissiveIntensity })
        : createWallMaterials({ ...wallColors, emissive, emissiveIntensity });

      if (wall.openings.length === 0) {
        segments.push(
          <mesh key={`${wall.id}-solid`} position={[cx, wall.height / 2 + elevation, cz]}
            rotation={[0, -angle, 0]} castShadow receiveShadow
            material={dualMats}>
            <boxGeometry args={[length, wall.height, wall.thickness]} />
          </mesh>
        );
      } else {
        const sortedOpenings = [...wall.openings].sort((a, b) => a.offset - b.offset);
        let cursor = 0;

        sortedOpenings.forEach((op, i) => {
          const opStart = op.offset * origLength - op.width / 2;
          const opEnd = op.offset * origLength + op.width / 2;
          const opBottom = op.type === 'window' ? (op.sillHeight ?? (wall.height - op.height) / 2) : 0;
          const opTop = opBottom + op.height;
          const isOpSelected = op.id === selectedOpeningId;

          // Get opening material
          const opMatId = op.materialId;
          const opMat = opMatId ? getMaterialById(opMatId) : null;

          if (opStart > cursor) {
            const segLen = opStart - cursor;
            const segCenter = cursor + segLen / 2;
            const localX = segCenter - origLength / 2;
            const pos = new THREE.Vector3(localX, 0, 0)
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
              .add(new THREE.Vector3(origCx, wall.height / 2 + elevation, origCz));
            segments.push(
              <mesh key={`${wall.id}-seg-${i}-pre`} position={pos.toArray()} rotation={[0, -angle, 0]} castShadow
                material={dualMats}>
                <boxGeometry args={[segLen, wall.height, wall.thickness]} />
              </mesh>
            );
          }

          if (opTop < wall.height) {
            const aboveH = wall.height - opTop;
            const localX = op.offset * origLength - origLength / 2;
            const pos = new THREE.Vector3(localX, 0, 0)
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
              .add(new THREE.Vector3(origCx, opTop + aboveH / 2 + elevation, origCz));
            segments.push(
              <mesh key={`${wall.id}-seg-${i}-above`} position={pos.toArray()} rotation={[0, -angle, 0]} castShadow
                material={dualMats}>
                <boxGeometry args={[op.width, aboveH, wall.thickness]} />
              </mesh>
            );
          }

          if (opBottom > 0) {
            const localX = op.offset * origLength - origLength / 2;
            const pos = new THREE.Vector3(localX, 0, 0)
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
              .add(new THREE.Vector3(origCx, opBottom / 2 + elevation, origCz));
            segments.push(
              <mesh key={`${wall.id}-seg-${i}-below`} position={pos.toArray()} rotation={[0, -angle, 0]} castShadow
                material={dualMats}>
                <boxGeometry args={[op.width, opBottom, wall.thickness]} />
              </mesh>
            );
          }

          // ─── 3D Door/Window/Garage/Passage models (clickable for selection) ───
          const flipSign = op.flipped ? -1 : 1;
          const localX = op.offset * origLength - origLength / 2;
          const opCenterY = opBottom + op.height / 2;
          const opPos = new THREE.Vector3(localX, 0, 0)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
            .add(new THREE.Vector3(origCx, opCenterY + elevation, origCz));

          const frameW = 0.04;
          const frameDepth = op.type === 'window' ? 0.10 : 0.06; // deeper window frames (Scandinavian)
          const defaultFrameColor = op.type === 'garage-door' ? '#6a6a6a' : '#c0c0c0';
          const frameColor = opMat?.color ?? defaultFrameColor;

          // Selection highlight
          const opEmissive = isOpSelected ? '#4a6aff' : '#000000';
          const opEmissiveIntensity = isOpSelected ? 0.5 : 0;

          if (op.type === 'door') {
            const isDouble = op.style === 'double';
            const isSliding = op.style === 'sliding';
            const panelW = isDouble ? (op.width - 0.04) / 2 : op.width - 0.04;
            const doorColor = opMat?.color ?? '#7a5a35';

            // Door frame – top
            segments.push(
              <mesh key={`${wall.id}-door-ft-${i}`} position={[opPos.x, opBottom + op.height - frameW / 2 + elevation, opPos.z]}
                rotation={[0, -angle, 0]} castShadow
                onPointerDown={(e) => handleOpeningClick(e, op.id)}>
                <boxGeometry args={[op.width, frameW, frameDepth]} />
                <meshStandardMaterial color={frameColor} roughness={0.3} emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
              </mesh>
            );
            // Door frame – left
            segments.push(
              <mesh key={`${wall.id}-door-fl-${i}`} position={new THREE.Vector3(localX - op.width / 2 + frameW / 2, 0, 0)
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz)).toArray()}
                rotation={[0, -angle, 0]} castShadow
                onPointerDown={(e) => handleOpeningClick(e, op.id)}>
                <boxGeometry args={[frameW, op.height, frameDepth]} />
                <meshStandardMaterial color={frameColor} roughness={0.3} emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
              </mesh>
            );
            // Door frame – right
            segments.push(
              <mesh key={`${wall.id}-door-fr-${i}`} position={new THREE.Vector3(localX + op.width / 2 - frameW / 2, 0, 0)
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz)).toArray()}
                rotation={[0, -angle, 0]} castShadow
                onPointerDown={(e) => handleOpeningClick(e, op.id)}>
                <boxGeometry args={[frameW, op.height, frameDepth]} />
                <meshStandardMaterial color={frameColor} roughness={0.3} emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
              </mesh>
            );

            // Door panel(s) – castShadow to block light
            if (isDouble) {
              segments.push(
                <mesh key={`${wall.id}-door-pl-${i}`} position={new THREE.Vector3(localX - panelW / 2 - 0.01, 0, 0)
                  .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                  .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz)).toArray()}
                  rotation={[0, -angle, 0]} castShadow
                  onPointerDown={(e) => handleOpeningClick(e, op.id)}>
                  <boxGeometry args={[panelW, op.height - 0.06, 0.04]} />
                  <meshStandardMaterial color={doorColor} roughness={0.5} emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
                </mesh>
              );
              segments.push(
                <mesh key={`${wall.id}-door-pr-${i}`} position={new THREE.Vector3(localX + panelW / 2 + 0.01, 0, 0)
                  .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                  .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz)).toArray()}
                  rotation={[0, -angle, 0]} castShadow
                  onPointerDown={(e) => handleOpeningClick(e, op.id)}>
                  <boxGeometry args={[panelW, op.height - 0.06, 0.04]} />
                  <meshStandardMaterial color={doorColor} roughness={0.5} emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
                </mesh>
              );
            } else {
              const panelOffset = isSliding ? -0.15 : 0;
              segments.push(
                <mesh key={`${wall.id}-door-panel-${i}`} position={new THREE.Vector3(localX + panelOffset, 0, 0)
                  .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                  .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz)).toArray()}
                  rotation={[0, -angle, 0]} castShadow
                  onPointerDown={(e) => handleOpeningClick(e, op.id)}>
                  <boxGeometry args={[panelW, op.height - 0.06, 0.04]} />
                  <meshStandardMaterial color={isSliding ? '#5a4a3a' : doorColor} roughness={0.5} emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
                </mesh>
              );
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
                .add(new THREE.Vector3(origCx, opBottom + 1.0 + elevation, origCz)).toArray()}
                rotation={[0, -angle, 0]}>
                <boxGeometry args={[0.12, 0.03, 0.05]} />
                <meshStandardMaterial color="#aaa" roughness={0.2} metalness={0.7} />
              </mesh>
            );
          } else if (op.type === 'window') {
            const isFrench = op.style === 'french';
            const isFixed = op.style === 'fixed';
            const hasMullion = !isFixed && op.width > 1.0;
            const outerFrameW = 0.05; // thicker Scandinavian outer frame

            // Glass panel (no castShadow - transparent)
            segments.push(
              <mesh key={`${wall.id}-win-glass-${i}`} position={[opPos.x, opCenterY + elevation, opPos.z]}
                rotation={[0, -angle, 0]}
                onPointerDown={(e) => handleOpeningClick(e, op.id)}>
                <boxGeometry args={[op.width - 0.06, op.height - 0.06, 0.008]} />
                <meshStandardMaterial color="#88ccff" transparent opacity={isFrench ? 0.35 : 0.3}
                  roughness={0.05} metalness={0.1} emissive={isOpSelected ? '#2244aa' : '#000000'} emissiveIntensity={isOpSelected ? 0.3 : 0} />
              </mesh>
            );

            // Full frame (4 bars) – deeper profile
            const bars: [string, number[], number[]][] = [
              ['top', [opPos.x, opCenterY + op.height / 2 - outerFrameW / 2 + elevation, opPos.z], [op.width, outerFrameW, frameDepth]],
              ['bottom', [opPos.x, opCenterY - op.height / 2 + outerFrameW / 2 + elevation, opPos.z], [op.width, outerFrameW, frameDepth]],
            ];
            const leftPos = new THREE.Vector3(localX - op.width / 2 + outerFrameW / 2, 0, 0)
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
              .add(new THREE.Vector3(origCx, opCenterY + elevation, origCz));
            bars.push(['left', leftPos.toArray(), [outerFrameW, op.height, frameDepth]]);
            const rightPos = new THREE.Vector3(localX + op.width / 2 - outerFrameW / 2, 0, 0)
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
              .add(new THREE.Vector3(origCx, opCenterY + elevation, origCz));
            bars.push(['right', rightPos.toArray(), [outerFrameW, op.height, frameDepth]]);

            // Vertical mullion for wide windows
            if (hasMullion) {
              bars.push(['mullion', [opPos.x, opCenterY + elevation, opPos.z], [outerFrameW * 0.7, op.height - 0.06, frameDepth * 0.8]]);
            }

            for (const [key, pos, dims] of bars) {
              segments.push(
                <mesh key={`${wall.id}-win-f${key}-${i}`} position={pos as [number, number, number]}
                  rotation={[0, -angle, 0]} castShadow
                  onPointerDown={(e) => handleOpeningClick(e, op.id)}>
                  <boxGeometry args={dims as [number, number, number]} />
                  <meshStandardMaterial color={frameColor} roughness={0.3} emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
                </mesh>
              );
            }

            // Inner reveal/recess (recessed into wall)
            const revealDepth = wall.thickness * 0.3;
            const revealColor = '#d0d0d0';
            // Top reveal
            segments.push(
              <mesh key={`${wall.id}-win-reveal-top-${i}`} position={[opPos.x, opCenterY + op.height / 2 - 0.01 + elevation, opPos.z]}
                rotation={[0, -angle, 0]}>
                <boxGeometry args={[op.width - 0.02, 0.02, revealDepth]} />
                <meshStandardMaterial color={revealColor} roughness={0.8} />
              </mesh>
            );

            // Window sill with exterior overhang
            if (!isFrench) {
              // Exterior sill (deeper, wider overhang)
              const sillNormal = new THREE.Vector3(0, 0, 1)
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
              segments.push(
                <mesh key={`${wall.id}-win-sill-${i}`}
                  position={[
                    opPos.x + sillNormal.x * 0.05,
                    opCenterY - op.height / 2 - 0.02 + elevation,
                    opPos.z + sillNormal.z * 0.05,
                  ]}
                  rotation={[0, -angle, 0]} castShadow>
                  <boxGeometry args={[op.width + 0.12, 0.03, wall.thickness + 0.10]} />
                  <meshStandardMaterial color="#e0e0e0" roughness={0.6} />
                </mesh>
              );
              // Interior sill (thinner)
              segments.push(
                <mesh key={`${wall.id}-win-sill-int-${i}`}
                  position={[
                    opPos.x - sillNormal.x * 0.04,
                    opCenterY - op.height / 2 - 0.01 + elevation,
                    opPos.z - sillNormal.z * 0.04,
                  ]}
                  rotation={[0, -angle, 0]}>
                  <boxGeometry args={[op.width + 0.04, 0.025, wall.thickness * 0.4]} />
                  <meshStandardMaterial color="#f0f0f0" roughness={0.7} />
                </mesh>
              );
            }
          } else if (op.type === 'garage-door') {
            // Garage door panel with horizontal sections – castShadow to block light
            const sections = 4;
            const sectionH = (op.height - 0.04) / sections;
            const garageColor = opMat?.color ?? '#b0b0b0';
            for (let s = 0; s < sections; s++) {
              const sy = opBottom + 0.02 + sectionH * s + sectionH / 2;
              segments.push(
                <mesh key={`${wall.id}-garage-sec-${i}-${s}`} position={new THREE.Vector3(localX, 0, 0)
                  .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                  .add(new THREE.Vector3(origCx, sy + elevation, origCz)).toArray()}
                  rotation={[0, -angle, 0]} castShadow
                  onPointerDown={(e) => handleOpeningClick(e, op.id)}>
                  <boxGeometry args={[op.width - 0.06, sectionH - 0.02, 0.04]} />
                  <meshStandardMaterial color={garageColor} roughness={0.7} metalness={0.2}
                    emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
                </mesh>
              );
            }

            // Garage door frame
            const gFrameW = 0.05;
            segments.push(
              <mesh key={`${wall.id}-garage-ft-${i}`} position={[opPos.x, opBottom + op.height - gFrameW / 2 + elevation, opPos.z]}
                rotation={[0, -angle, 0]} castShadow
                onPointerDown={(e) => handleOpeningClick(e, op.id)}>
                <boxGeometry args={[op.width, gFrameW, 0.07]} />
                <meshStandardMaterial color="#555" roughness={0.4} metalness={0.3} emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
              </mesh>
            );
            segments.push(
              <mesh key={`${wall.id}-garage-fl-${i}`} position={new THREE.Vector3(localX - op.width / 2 + gFrameW / 2, 0, 0)
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz)).toArray()}
                rotation={[0, -angle, 0]} castShadow
                onPointerDown={(e) => handleOpeningClick(e, op.id)}>
                <boxGeometry args={[gFrameW, op.height, 0.07]} />
                <meshStandardMaterial color="#555" roughness={0.4} metalness={0.3} emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
              </mesh>
            );
            segments.push(
              <mesh key={`${wall.id}-garage-fr-${i}`} position={new THREE.Vector3(localX + op.width / 2 - gFrameW / 2, 0, 0)
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
                .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz)).toArray()}
                rotation={[0, -angle, 0]} castShadow
                onPointerDown={(e) => handleOpeningClick(e, op.id)}>
                <boxGeometry args={[gFrameW, op.height, 0.07]} />
                <meshStandardMaterial color="#555" roughness={0.4} metalness={0.3} emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
              </mesh>
            );
          }

          cursor = opEnd;
        });

        if (cursor < origLength) {
          const segLen = origLength - cursor;
          const segCenter = cursor + segLen / 2;
          const localX2 = segCenter - origLength / 2;
          const pos = new THREE.Vector3(localX2, 0, 0)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
            .add(new THREE.Vector3(origCx, wall.height / 2 + elevation, origCz));
          segments.push(
            <mesh key={`${wall.id}-seg-last`} position={pos.toArray()} rotation={[0, -angle, 0]} castShadow
              material={dualMats}>
              <boxGeometry args={[segLen, wall.height, wall.thickness]} />
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
  }, [walls, rooms, elevation, selectedWallId, selectedOpeningId, hoveredWallId, activeTool, handleWallClick, handleOpeningClick, wallRoomMaterial]);

  // ── Corner fill blocks ──
  const cornerBlocks = useMemo(() => {
    const eps = 0.05;
    const nodeMap = new Map<string, { pos: [number, number]; maxThickness: number; maxHeight: number; wallColors: ReturnType<typeof resolveWallColors>[] }>();
    
    for (const wall of walls) {
      const fallbackMatId = wallRoomMaterial[wall.id];
      const wc = resolveWallColors(wall, fallbackMatId);
      for (const pt of [wall.from, wall.to]) {
        const key = `${Math.round(pt[0] / eps) * eps},${Math.round(pt[1] / eps) * eps}`;
        const existing = nodeMap.get(key);
        if (existing) {
          existing.maxThickness = Math.max(existing.maxThickness, wall.thickness);
          existing.maxHeight = Math.max(existing.maxHeight, wall.height);
          existing.wallColors.push(wc);
        } else {
          nodeMap.set(key, { pos: pt, maxThickness: wall.thickness, maxHeight: wall.height, wallColors: [wc] });
        }
      }
    }

    const blocks: JSX.Element[] = [];
    for (const [key, { pos, maxThickness, maxHeight, wallColors }] of nodeMap) {
      let connectionCount = 0;
      for (const wall of walls) {
        const df = Math.abs(wall.from[0] - pos[0]) + Math.abs(wall.from[1] - pos[1]);
        const dt = Math.abs(wall.to[0] - pos[0]) + Math.abs(wall.to[1] - pos[1]);
        if (df < eps || dt < eps) connectionCount++;
      }
      if (connectionCount >= 2) {
        const dominantColor = wallColors[0]?.exteriorColor ?? '#e0e0e0';
        blocks.push(
          <mesh key={`corner-${key}`}
            position={[pos[0], maxHeight / 2 + elevation, pos[1]]}
            castShadow receiveShadow>
            <boxGeometry args={[maxThickness, maxHeight, maxThickness]} />
            <meshStandardMaterial color={dominantColor} roughness={0.7} side={THREE.FrontSide} />
          </mesh>
        );
      }
    }
    return blocks;
  }, [walls, elevation, wallRoomMaterial]);

  return <group renderOrder={1}>{wallMeshes}{cornerBlocks}</group>;
}
