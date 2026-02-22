import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';
import Walls3D from './build/Walls3D';
import Floors3D from './build/Floors3D';
import Ceilings3D from './build/Ceilings3D';
import Stairs3D from './build/Stairs3D';
import ImportedHome3D from './build/ImportedHome3D';
import Props3D from './build/Props3D';
import DeviceMarkers3D from './devices/DeviceMarkers3D';
import WeatherEffects3D from './build/WeatherEffects3D';
import GroundPlane from './build/GroundPlane';

function SceneContent() {
  const sunAzimuth = useAppStore((s) => s.environment.sunAzimuth);
  const sunElevation = useAppStore((s) => s.environment.sunElevation);
  const weatherCondition = useAppStore((s) => s.environment.weather.condition);

  const sunPos = useMemo(() => {
    const azRad = (sunAzimuth * Math.PI) / 180;
    const elRad = (sunElevation * Math.PI) / 180;
    const dist = 20;
    return [
      dist * Math.cos(elRad) * Math.sin(azRad),
      dist * Math.sin(elRad),
      dist * Math.cos(elRad) * Math.cos(azRad),
    ] as [number, number, number];
  }, [sunAzimuth, sunElevation]);

  const sunIntensity = weatherCondition === 'cloudy' ? 0.4 : weatherCondition === 'rain' ? 0.2 : weatherCondition === 'snow' ? 0.3 : 1.2;

  return (
    <>
      <ambientLight intensity={weatherCondition === 'cloudy' || weatherCondition === 'rain' ? 0.5 : 0.35} color="#b8c4d4" />
      <directionalLight position={sunPos} intensity={sunIntensity} color="#ffd699" castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-far={50} shadow-camera-left={-20} shadow-camera-right={20}
        shadow-camera-top={20} shadow-camera-bottom={-20} />
      <pointLight position={[0, 8, 0]} intensity={0.15} color="#4a9eff" />

      <GroundPlane onPointerDown={() => {}} onPointerMove={() => {}} />

      <Grid
        args={[100, 100]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#2a2d35"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#3a3d45"
        fadeDistance={30}
        position={[0, 0, 0]}
      />

      <Walls3D />
      <Floors3D />
      <Ceilings3D />
      <Stairs3D />
      <ImportedHome3D />
      <Props3D />
      <WeatherEffects3D />
      <DeviceMarkers3D />

      <Environment preset="night" />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
      />
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
        <SceneContent />
      </Suspense>
    </Canvas>
  );
}
