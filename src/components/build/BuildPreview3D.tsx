import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Suspense } from 'react';
import Walls3D from './Walls3D';
import Floors3D from './Floors3D';

export default function BuildPreview3D() {
  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{ position: [10, 10, 10], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 15, 8]} intensity={1} castShadow />
          <Walls3D />
          <Floors3D />
          <Grid
            args={[30, 30]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#2a2d35"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#3a3d45"
            fadeDistance={20}
          />
          <Environment preset="night" />
          <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
        </Suspense>
      </Canvas>
    </div>
  );
}
