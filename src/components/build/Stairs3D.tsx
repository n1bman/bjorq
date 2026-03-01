import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';

export default function Stairs3D() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floor = floors.find((f) => f.id === activeFloorId);
  const stairs = floor?.stairs ?? [];
  const elevation = floor?.elevation ?? 0;
  const floorHeight = floor?.heightMeters ?? 2.5;

  const stairMeshes = useMemo(() => {
    return stairs.map((stair) => {
      const treads = 12;
      const treadHeight = floorHeight / treads;
      const treadDepth = stair.length / treads;

      const treadElements = [];
      for (let i = 0; i < treads; i++) {
        treadElements.push(
          <mesh
            key={`${stair.id}-tread-${i}`}
            position={[0, treadHeight * i + treadHeight / 2, -stair.length / 2 + treadDepth * i + treadDepth / 2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[stair.width, treadHeight * 0.3, treadDepth * 0.95]} />
            <meshStandardMaterial color="#8b7355" roughness={0.7} />
          </mesh>
        );
        // Riser
        treadElements.push(
          <mesh
            key={`${stair.id}-riser-${i}`}
            position={[0, treadHeight * i + treadHeight * 0.15, -stair.length / 2 + treadDepth * i]}
            castShadow
          >
            <boxGeometry args={[stair.width, treadHeight * 0.7, 0.02]} />
            <meshStandardMaterial color="#6b5940" roughness={0.8} />
          </mesh>
        );
      }

      return (
        <group
          key={stair.id}
          position={[stair.position[0], elevation, stair.position[1]]}
          rotation={[0, -stair.rotation, 0]}
        >
          {treadElements}
        </group>
      );
    });
  }, [stairs, elevation, floorHeight]);

  return <group>{stairMeshes}</group>;
}
