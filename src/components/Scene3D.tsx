import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Suspense, useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';
import { cameraRef } from '@/lib/cameraRef';
import Walls3D from './build/Walls3D';
import Floors3D from './build/Floors3D';
import Ceilings3D from './build/Ceilings3D';
import Stairs3D from './build/Stairs3D';
import ImportedHome3D from './build/ImportedHome3D';
import Props3D from './build/Props3D';
import DeviceMarkers3D from './devices/DeviceMarkers3D';
import WeatherEffects3D from './build/WeatherEffects3D';
import GroundPlane from './build/GroundPlane';
import type { CameraPreset, StandbyCameraView } from '@/store/types';

const presetPositions: Record<CameraPreset, THREE.Vector3> = {
  free: new THREE.Vector3(12, 12, 12),
  topdown: new THREE.Vector3(0, 25, 0.01),
  angle: new THREE.Vector3(12, 12, 12),
  front: new THREE.Vector3(0, 6, 20),
};

const presetTargets: Record<CameraPreset, THREE.Vector3> = {
  free: new THREE.Vector3(0, 0, 0),
  topdown: new THREE.Vector3(0, 0, 0),
  angle: new THREE.Vector3(0, 0, 0),
  front: new THREE.Vector3(0, 2, 0),
};

const standbyCameraPositions: Partial<Record<StandbyCameraView, [number, number, number]>> = {
  standard: [10, 9, 10],
  topdown: [0, 22, 0.01],
  'angled-left': [-10, 9, 10],
  'angled-right': [10, 9, -10],
  close: [6, 6, 6],
};

const standbyCameraTargets: Partial<Record<StandbyCameraView, [number, number, number]>> = {
  standard: [0, 1, 0],
  topdown: [0, 0, 0],
  'angled-left': [0, 1, 0],
  'angled-right': [0, 1, 0],
  close: [0, 1, 0],
};

function StandbyStaticCamera() {
  const cameraView = useAppStore((s) => s.standby.cameraView);
  const customPos = useAppStore((s) => s.standby.customPos);
  const customTarget = useAppStore((s) => s.standby.customTarget);

  useFrame(({ camera }) => {
    const pos = cameraView === 'custom' && customPos ? customPos : standbyCameraPositions[cameraView] || standbyCameraPositions.standard;
    const target = cameraView === 'custom' && customTarget ? customTarget : standbyCameraTargets[cameraView] || standbyCameraTargets.standard;
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(target[0], target[1], target[2]);
  });

  return null;
}

function CameraController() {
  const cameraPreset = useAppStore((s) => s.homeView.cameraPreset);
  const appMode = useAppStore((s) => s.appMode);
  const controlsRef = useRef<any>(null);
  const prevPreset = useRef(cameraPreset);

  useEffect(() => {
    if (cameraPreset !== prevPreset.current) {
      prevPreset.current = cameraPreset;
    }
  }, [cameraPreset]);

  useFrame(({ camera }, delta) => {
    // Always update global camera ref for "save camera" feature
    cameraRef.position.copy(camera.position);
    if (controlsRef.current) {
      cameraRef.target.copy(controlsRef.current.target);
    }

    if (cameraPreset === 'free') return;
    const targetPos = presetPositions[cameraPreset];
    camera.position.lerp(targetPos, delta * 3);
    if (controlsRef.current) {
      const target = presetTargets[cameraPreset];
      controlsRef.current.target.lerp(target, delta * 3);
      controlsRef.current.update();
    }
  });

  if (appMode === 'standby') {
    return <StandbyStaticCamera />;
  }

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2.1}
    />
  );
}

function SceneContent() {
  const appMode = useAppStore((s) => s.appMode);
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

  // Day/night ambient
  const isNight = sunElevation < 0;
  const isTwilight = sunElevation >= 0 && sunElevation < 15;
  const ambientIntensity = isNight ? 0.1 : isTwilight ? 0.25 : (weatherCondition === 'cloudy' || weatherCondition === 'rain' ? 0.5 : 0.35);
  const ambientColor = isNight ? '#1a1a3e' : isTwilight ? '#ff9966' : '#b8c4d4';
  const sunIntensity = isNight ? 0 : (weatherCondition === 'cloudy' ? 0.4 : weatherCondition === 'rain' ? 0.2 : weatherCondition === 'snow' ? 0.3 : 1.2);

  return (
    <>
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight position={sunPos} intensity={sunIntensity} color="#ffd699" castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-far={50} shadow-camera-left={-20} shadow-camera-right={20}
        shadow-camera-top={20} shadow-camera-bottom={-20} />
      {!isNight && <pointLight position={[0, 8, 0]} intensity={0.15} color="#4a9eff" />}

      <GroundPlane onPointerDown={() => {}} onPointerMove={() => {}} />

      {appMode === 'build' && (
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
      )}

      <Walls3D />
      <Floors3D />
      <Ceilings3D />
      <Stairs3D />
      <ImportedHome3D />
      <Props3D />
      <WeatherEffects3D />
      <DeviceMarkers3D />

      <Environment preset="night" />
      <CameraController />
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
