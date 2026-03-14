import { useMemo, useCallback, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getMaterialById } from '../../lib/materials';
import { applyFloorTextures } from '../../lib/wallTextureLoader';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';

/**
 * F1: Floor selection uses a perimeter outline instead of a solid blue fill,
 * so the real material/texture preview remains visible during editing.
 */
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

        // Calculate bounding box for texture sizing
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const p of polygon) {
          minX = Math.min(minX, p[0]);
          maxX = Math.max(maxX, p[0]);
          minZ = Math.min(minZ, p[1]);
          maxZ = Math.max(maxZ, p[1]);
        }
        const floorW = maxX - minX;
        const floorD = maxZ - minZ;

        // F1: Always show real material color — selection uses outline only
        const threeMat = new THREE.MeshStandardMaterial({
          color: color,
          roughness: mat?.roughness ?? 0.9,
          metalness: mat?.metalness ?? 0,
          side: THREE.FrontSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
          // F1: Very subtle emissive tint when selected (texture stays visible)
          emissive: isSelected ? '#1a3a6a' : '#000000',
          emissiveIntensity: isSelected ? 0.08 : 0,
        });

        // F1: Always apply textures — no longer skipped when selected
        if (mat) {
          const sizeMode = room.floorSizeMode ?? 'auto';
          applyFloorTextures(threeMat, mat, floorW || 4, floorD || 4, sizeMode);
        }

        // F1: Build perimeter outline geometry for selected room
        let outlineMesh = null;
        if (isSelected) {
          const outlinePoints: THREE.Vector3[] = [];
          for (const p of polygon) {
            outlinePoints.push(new THREE.Vector3(p[0], 0, p[1]));
          }
          // Close the loop
          outlinePoints.push(outlinePoints[0].clone());
          const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePoints);
          outlineMesh = (
            <line
              key={`outline-${room.id}`}
              position={[0, (floor?.elevation ?? 0) + 0.04, 0]}
              geometry={outlineGeo}
            >
              <lineBasicMaterial color="#4a9eff" linewidth={2} depthTest={false} transparent opacity={0.9} />
            </line>
          );
        }

        return (
          <group key={room.id}>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, (floor?.elevation ?? 0) + 0.02, 0]}
              receiveShadow
              onPointerDown={(e) => handleRoomClick(e, room.id)}
            >
              <shapeGeometry args={[shape]} />
              <primitive object={threeMat} attach="material" />
            </mesh>
            {outlineMesh}
          </group>
        );
      });
  }, [rooms, floor?.elevation, selectedRoomId, handleRoomClick]);

  return <group>{roomMeshes}</group>;
}
