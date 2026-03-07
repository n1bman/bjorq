import { useMemo, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getMaterialById } from '../../lib/materials';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';

export default function Floors3D() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floor = floors.find((f) => f.id === activeFloorId);
  const rooms = floor?.rooms ?? [];
  const appMode = useAppStore((s) => s.appMode);
  const selection = useAppStore((s) => s.build.selection);
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setSelection = useAppStore((s) => s.setSelection);

  const selectedRoomId = selection.type === 'room' ? selection.id : null;
  const isBuildMode = appMode === 'build';

  const handleRoomClick = useCallback((e: ThreeEvent<PointerEvent>, roomId: string) => {
    if (!isBuildMode) return;
    if (activeTool !== 'select' && activeTool !== 'paint') return;
    e.stopPropagation();
    setSelection({ type: 'room', id: roomId });
  }, [isBuildMode, activeTool, setSelection]);

  const roomMeshes = useMemo(() => {
    return rooms
      .filter((r) => r.polygon && r.polygon.length >= 3)
      .map((room) => {
        const polygon = room.polygon!;
        const mat = room.floorMaterialId ? getMaterialById(room.floorMaterialId) : null;
        const color = mat?.color ?? '#d4c5a9';
        const isSelected = room.id === selectedRoomId;

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
            position={[0, (floor?.elevation ?? 0) + 0.02, 0]}
            receiveShadow
            onPointerDown={(e) => handleRoomClick(e, room.id)}
          >
            <shapeGeometry args={[shape]} />
            <meshStandardMaterial
              color={isSelected ? '#4a9eff' : color}
              roughness={mat?.roughness ?? 0.9}
              side={THREE.FrontSide}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
              emissive={isSelected ? '#1a3a6a' : '#000000'}
              emissiveIntensity={isSelected ? 0.4 : 0}
            />
          </mesh>
        );
      });
  }, [rooms, floor?.elevation, selectedRoomId, handleRoomClick]);

  return <group>{roomMeshes}</group>;
}
