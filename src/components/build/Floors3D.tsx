import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getMaterialById } from '../../lib/materials';
import * as THREE from 'three';

export default function Floors3D() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floor = floors.find((f) => f.id === activeFloorId);
  const rooms = floor?.rooms ?? [];

  const roomMeshes = useMemo(() => {
    return rooms
      .filter((r) => r.polygon && r.polygon.length >= 3)
      .map((room) => {
        const polygon = room.polygon!;
        const mat = room.floorMaterialId ? getMaterialById(room.floorMaterialId) : null;
        const color = mat?.color ?? '#d4c5a9';

        const shape = new THREE.Shape();
        shape.moveTo(polygon[0][0], -polygon[0][1]);
        for (let i = 1; i < polygon.length; i++) {
          shape.lineTo(polygon[i][0], -polygon[i][1]);
        }
        shape.closePath();

        return (
          <mesh
            key={room.id}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, (floor?.elevation ?? 0) + 0.01, 0]}
            receiveShadow
          >
            <shapeGeometry args={[shape]} />
            <meshStandardMaterial
              color={color}
              roughness={mat?.roughness ?? 0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      });
  }, [rooms, floor?.elevation]);

  return <group>{roomMeshes}</group>;
}
