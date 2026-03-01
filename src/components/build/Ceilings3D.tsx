import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import * as THREE from 'three';

export default function Ceilings3D() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const homeSource = useAppStore((s) => s.homeGeometry.source);
  const floor = floors.find((f) => f.id === activeFloorId);
  const rooms = floor?.rooms ?? [];

  const ceilingY = (floor?.elevation ?? 0) + (floor?.heightMeters ?? 2.5);

  const ceilingMeshes = useMemo(() => {
    return rooms
      .filter((r) => r.polygon && r.polygon.length >= 3)
      .map((room) => {
        const polygon = room.polygon!;
        const shape = new THREE.Shape();
        shape.moveTo(polygon[0][0], -polygon[0][1]);
        for (let i = 1; i < polygon.length; i++) {
          shape.lineTo(polygon[i][0], -polygon[i][1]);
        }
        shape.closePath();

        return (
          <mesh
            key={`ceiling-${room.id}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, ceilingY, 0]}
            castShadow
          >
            <shapeGeometry args={[shape]} />
            <meshBasicMaterial
              colorWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      });
  }, [rooms, ceilingY]);

  return (
    <group>
      {ceilingMeshes}
    </group>
  );
}
