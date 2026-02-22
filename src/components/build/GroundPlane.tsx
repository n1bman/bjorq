import { useRef } from 'react';
import * as THREE from 'three';

interface GroundPlaneProps {
  onPointerDown?: (point: THREE.Vector3, e: any) => void;
  onPointerMove?: (point: THREE.Vector3, e: any) => void;
}

export default function GroundPlane({ onPointerDown, onPointerMove }: GroundPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (onPointerDown) {
      onPointerDown(e.point, e);
    }
  };

  const handlePointerMove = (e: any) => {
    if (onPointerMove) {
      onPointerMove(e.point, e);
    }
  };

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      receiveShadow
    >
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#1a1d23" transparent opacity={0.6} />
    </mesh>
  );
}
