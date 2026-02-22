import { Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { useAppStore } from '@/store/useAppStore';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function PropModel({ url, position, rotation, scale }: {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}) {
  const gltf = useLoader(GLTFLoader, url);

  return (
    <primitive
      object={gltf.scene.clone()}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

export default function Props3D() {
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const items = useAppStore((s) => s.props.items);

  const floorItems = items.filter((p) => p.floorId === activeFloorId);

  if (floorItems.length === 0) return null;

  return (
    <group>
      {floorItems.map((prop) => (
        <Suspense key={prop.id} fallback={
          <mesh position={prop.position}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#e8a838" wireframe />
          </mesh>
        }>
          <PropModel
            url={prop.url}
            position={prop.position}
            rotation={prop.rotation}
            scale={prop.scale}
          />
        </Suspense>
      ))}
    </group>
  );
}
