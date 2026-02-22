import { Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { useAppStore } from '@/store/useAppStore';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function ImportedModel({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);

  return <primitive object={gltf.scene.clone()} />;
}

export default function ImportedHome3D() {
  const homeGeometry = useAppStore((s) => s.homeGeometry);

  if (homeGeometry.source !== 'imported' || !homeGeometry.imported.url) return null;

  const { position, rotation, scale } = homeGeometry.imported;

  return (
    <group
      position={position}
      rotation={rotation.map((r) => (r * Math.PI) / 180) as [number, number, number]}
      scale={scale}
    >
      <Suspense fallback={
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#4a9eff" wireframe />
        </mesh>
      }>
        <ImportedModel url={homeGeometry.imported.url} />
      </Suspense>
    </group>
  );
}
