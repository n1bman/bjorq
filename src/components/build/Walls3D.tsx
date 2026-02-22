import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getMaterialById } from '@/lib/materials';
import * as THREE from 'three';

export default function Walls3D() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floor = floors.find((f) => f.id === activeFloorId);
  const walls = floor?.walls ?? [];

  const wallMeshes = useMemo(() => {
    return walls.map((wall) => {
      const dx = wall.to[0] - wall.from[0];
      const dz = wall.to[1] - wall.from[1];
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      const cx = (wall.from[0] + wall.to[0]) / 2;
      const cz = (wall.from[1] + wall.to[1]) / 2;
      const mat = wall.materialId ? getMaterialById(wall.materialId) : null;
      const color = mat?.color ?? '#e8a845';

      // If no openings, render single box
      if (wall.openings.length === 0) {
        return (
          <mesh
            key={wall.id}
            position={[cx, wall.height / 2 + (floor?.elevation ?? 0), cz]}
            rotation={[0, -angle, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[length, wall.height, wall.thickness]} />
            <meshStandardMaterial color={color} roughness={mat?.roughness ?? 0.8} />
          </mesh>
        );
      }

      // With openings: split wall into segments
      const segments: JSX.Element[] = [];
      const sortedOpenings = [...wall.openings].sort((a, b) => a.offset - b.offset);
      const elevation = floor?.elevation ?? 0;

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
            .add(new THREE.Vector3(cx, wall.height / 2 + elevation, cz));
          segments.push(
            <mesh key={`${wall.id}-seg-${i}-pre`} position={pos.toArray()} rotation={[0, -angle, 0]} castShadow>
              <boxGeometry args={[segLen, wall.height, wall.thickness]} />
              <meshStandardMaterial color={color} roughness={mat?.roughness ?? 0.8} />
            </mesh>
          );
        }

        // Above opening
        if (opTop < wall.height) {
          const aboveH = wall.height - opTop;
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
          const localX = op.offset * length - length / 2;
          const pos = new THREE.Vector3(localX, 0, 0)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
            .add(new THREE.Vector3(cx, opBottom / 2 + elevation, cz));
          segments.push(
            <mesh key={`${wall.id}-seg-${i}-below`} position={pos.toArray()} rotation={[0, -angle, 0]} castShadow>
              <boxGeometry args={[op.width, opBottom, wall.thickness]} />
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
          .add(new THREE.Vector3(cx, wall.height / 2 + elevation, cz));
        segments.push(
          <mesh key={`${wall.id}-seg-last`} position={pos.toArray()} rotation={[0, -angle, 0]} castShadow>
            <boxGeometry args={[segLen, wall.height, wall.thickness]} />
            <meshStandardMaterial color={color} roughness={mat?.roughness ?? 0.8} />
          </mesh>
        );
      }

      return <group key={wall.id}>{segments}</group>;
    });
  }, [walls, floor?.elevation]);

  return <group>{wallMeshes}</group>;
}
