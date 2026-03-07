import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getMaterialById } from '../../lib/materials';
import * as THREE from 'three';

/* Helper: find max thickness of walls connected at a point */
function getConnectedThickness(
  walls: { from: [number, number]; to: [number, number]; thickness: number; id: string }[],
  wallId: string,
  point: [number, number],
  eps = 0.05,
): number {
  let maxT = 0;
  for (const w of walls) {
    if (w.id === wallId) continue;
    const df = Math.abs(w.from[0] - point[0]) + Math.abs(w.from[1] - point[1]);
    const dt = Math.abs(w.to[0] - point[0]) + Math.abs(w.to[1] - point[1]);
    if (df < eps || dt < eps) maxT = Math.max(maxT, w.thickness);
  }
  return maxT;
}

export default function Walls3D() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const wallViewMode = useAppStore((s) => s.build.view.wallViewMode);
  const selectedRoomId = useAppStore((s) => s.build.selection.type === 'room' ? s.build.selection.id : null);
  const appMode = useAppStore((s) => s.appMode);
  const floor = floors.find((f) => f.id === activeFloorId);
  const walls = floor?.walls ?? [];
  const rooms = floor?.rooms ?? [];

  // In home/dashboard mode, show full walls
  const effectiveMode = appMode === 'build' ? wallViewMode : 'up';

  const wallMeshes = useMemo(() => {
    if (effectiveMode === 'down') return []; // No walls visible

    // For room-focus, find wallIds belonging to selected room
    let visibleWallIds: Set<string> | null = null;
    if (effectiveMode === 'room-focus' && selectedRoomId) {
      const room = rooms.find((r) => r.id === selectedRoomId);
      if (room) {
        visibleWallIds = new Set(room.wallIds);
      }
    }

    // Cutaway height
    const cutawayHeight = effectiveMode === 'cutaway' ? 1.2 : undefined;

    return walls.map((wall) => {
      // Room-focus: hide walls not in selected room
      if (visibleWallIds && !visibleWallIds.has(wall.id)) return null;

      const dx = wall.to[0] - wall.from[0];
      const dz = wall.to[1] - wall.from[1];
      let length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      let cx = (wall.from[0] + wall.to[0]) / 2;
      let cz = (wall.from[1] + wall.to[1]) / 2;

      // ── Wall corner mitering ──
      const trimFrom = getConnectedThickness(walls, wall.id, wall.from);
      const trimTo = getConnectedThickness(walls, wall.id, wall.to);
      if (trimFrom > 0 || trimTo > 0) {
        const totalTrim = trimFrom / 2 + trimTo / 2;
        if (totalTrim < length) {
          const dir = new THREE.Vector2(dx, dz).normalize();
          const nfx = wall.from[0] + dir.x * trimFrom / 2;
          const nfz = wall.from[1] + dir.y * trimFrom / 2;
          const ntx = wall.to[0] - dir.x * trimTo / 2;
          const ntz = wall.to[1] - dir.y * trimTo / 2;
          length -= totalTrim;
          cx = (nfx + ntx) / 2;
          cz = (nfz + ntz) / 2;
        }
      }
      const mat = wall.materialId ? getMaterialById(wall.materialId) : null;
      const color = mat?.color ?? '#e8a845';

      const renderHeight = cutawayHeight ? Math.min(wall.height, cutawayHeight) : wall.height;
      const elevation = floor?.elevation ?? 0;

      // If no openings, render single box
      if (wall.openings.length === 0) {
        return (
          <mesh
            key={wall.id}
            position={[cx, renderHeight / 2 + elevation, cz]}
            rotation={[0, -angle, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[length, renderHeight, wall.thickness]} />
            <meshStandardMaterial color={color} roughness={mat?.roughness ?? 0.8} />
          </mesh>
        );
      }

      // With openings: split wall into segments
      const segments: JSX.Element[] = [];
      const sortedOpenings = [...wall.openings].sort((a, b) => a.offset - b.offset);

      let cursor = 0;
      sortedOpenings.forEach((op, i) => {
        const opStart = op.offset * length - op.width / 2;
        const opEnd = op.offset * length + op.width / 2;
        const opBottom = op.type === 'window' ? (wall.height - op.height) / 2 : 0;
        const opTop = opBottom + op.height;

        // Segment before opening
        if (opStart > cursor) {
          const segLen = opStart - cursor;
          const segCenter = cursor + segLen / 2;
          const localX = segCenter - length / 2;
          const pos = new THREE.Vector3(localX, 0, 0)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
            .add(new THREE.Vector3(cx, renderHeight / 2 + elevation, cz));
          segments.push(
            <mesh key={`${wall.id}-seg-${i}-pre`} position={pos.toArray()} rotation={[0, -angle, 0]} castShadow>
              <boxGeometry args={[segLen, renderHeight, wall.thickness]} />
              <meshStandardMaterial color={color} roughness={mat?.roughness ?? 0.8} />
            </mesh>
          );
        }

        // Above opening (only if within render height)
        if (opTop < renderHeight) {
          const aboveH = renderHeight - opTop;
          const localX = op.offset * length - length / 2;
          const pos = new THREE.Vector3(localX, 0, 0)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
            .add(new THREE.Vector3(cx, opTop + aboveH / 2 + elevation, cz));
          segments.push(
            <mesh key={`${wall.id}-seg-${i}-above`} position={pos.toArray()} rotation={[0, -angle, 0]} castShadow>
              <boxGeometry args={[op.width, aboveH, wall.thickness]} />
              <meshStandardMaterial color={color} roughness={mat?.roughness ?? 0.8} />
            </mesh>
          );
        }

        // Below opening (for windows)
        if (opBottom > 0) {
          const belowH = Math.min(opBottom, renderHeight);
          const localX = op.offset * length - length / 2;
          const pos = new THREE.Vector3(localX, 0, 0)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
            .add(new THREE.Vector3(cx, belowH / 2 + elevation, cz));
          segments.push(
            <mesh key={`${wall.id}-seg-${i}-below`} position={pos.toArray()} rotation={[0, -angle, 0]} castShadow>
              <boxGeometry args={[op.width, belowH, wall.thickness]} />
              <meshStandardMaterial color={color} roughness={mat?.roughness ?? 0.8} />
            </mesh>
          );
        }

        cursor = opEnd;
      });

      // Final segment after last opening
      if (cursor < length) {
        const segLen = length - cursor;
        const segCenter = cursor + segLen / 2;
        const localX = segCenter - length / 2;
        const pos = new THREE.Vector3(localX, 0, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
          .add(new THREE.Vector3(cx, renderHeight / 2 + elevation, cz));
        segments.push(
          <mesh key={`${wall.id}-seg-last`} position={pos.toArray()} rotation={[0, -angle, 0]} castShadow>
            <boxGeometry args={[segLen, renderHeight, wall.thickness]} />
            <meshStandardMaterial color={color} roughness={mat?.roughness ?? 0.8} />
          </mesh>
        );
      }

      return <group key={wall.id}>{segments}</group>;
    }).filter(Boolean);
  }, [walls, floor?.elevation, effectiveMode, selectedRoomId, rooms]);

  return <group>{wallMeshes}</group>;
}
