import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Suspense } from 'react';

function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#1a1d23" transparent opacity={0.8} />
    </mesh>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.3} color="#b8c4d4" />
      <directionalLight
        position={[10, 15, 8]}
        intensity={1.2}
        color="#ffd699"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <pointLight position={[0, 8, 0]} intensity={0.2} color="#4a9eff" />
    </>
  );
}

export default function Scene3D() {
  return (
    <Canvas
      shadows
      camera={{ position: [12, 12, 12], fov: 45 }}
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <SceneLighting />
        <GroundPlane />
        <Grid
          args={[50, 50]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#2a2d35"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#3a3d45"
          fadeDistance={30}
          position={[0, 0, 0]}
        />
        <Environment preset="night" />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={3}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2.1}
          touches={{ ONE: 1, TWO: 2 }}
        />
      </Suspense>
    </Canvas>
  );
}
