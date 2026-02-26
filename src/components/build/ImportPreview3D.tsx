import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { Suspense, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';
import ImportedHome3D from './ImportedHome3D';

function SyncCamera() {
  const { camera } = useThree();

  useFrame(() => {
    const sync = useAppStore.getState().build.importOverlaySync;
    if (!sync || !(camera instanceof THREE.OrthographicCamera)) return;

    const baseFactor = 2;
    camera.zoom = sync.zoom / baseFactor;
    camera.position.x = sync.offsetX;
    camera.position.z = sync.offsetY;
    camera.position.y = 50;
    camera.updateProjectionMatrix();
  });

  return null;
}

export default function ImportPreview3D() {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 50, 0], zoom: 20, near: 0.1, far: 200, up: [0, 0, -1] }}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      gl={{ antialias: true, alpha: true }}
    >
      <SyncCamera />

      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 30, 10]} intensity={0.8} />

      <Grid
        args={[100, 100]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#2a2d35"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#3a3d45"
        fadeDistance={40}
        position={[0, -0.01, 0]}
      />

      <Suspense fallback={null}>
        <ImportedHome3D />
      </Suspense>
    </Canvas>
  );
}
