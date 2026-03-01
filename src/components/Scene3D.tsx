import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Suspense, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import { cameraRef } from '../lib/cameraRef';
import Walls3D from './build/Walls3D';
import Floors3D from './build/Floors3D';
import Ceilings3D from './build/Ceilings3D';
import Stairs3D from './build/Stairs3D';
import ImportedHome3D from './build/ImportedHome3D';
import Props3D from './build/Props3D';
import DeviceMarkers3D from './devices/DeviceMarkers3D';
import WeatherEffects3D from './build/WeatherEffects3D';
import GroundPlane from './build/GroundPlane';
import type { CameraPreset, StandbyCameraView } from '../store/types';

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
    if (pos) camera.position.set(pos[0], pos[1], pos[2]);
    if (target) camera.lookAt(target[0], target[1], target[2]);
  });

  return null;
}

function CameraController() {
  const cameraPreset = useAppStore((s) => s.homeView.cameraPreset);
  const appMode = useAppStore((s) => s.appMode);
  const customStartPos = useAppStore((s) => s.homeView.customStartPos);
  const customStartTarget = useAppStore((s) => s.homeView.customStartTarget);
  const controlsRef = useRef<any>(null);
  const prevMode = useRef(appMode);
  const lerpingTo = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    if ((appMode === 'dashboard' || appMode === 'home') && prevMode.current !== appMode) {
      const pos = customStartPos
        ? new THREE.Vector3(...customStartPos)
        : presetPositions.topdown.clone();
      const target = customStartTarget
        ? new THREE.Vector3(...customStartTarget)
        : presetTargets.topdown.clone();
      lerpingTo.current = { pos, target };
    }
    prevMode.current = appMode;
  }, [appMode, customStartPos, customStartTarget]);

  useEffect(() => {
    if (cameraPreset !== 'free') {
      lerpingTo.current = {
        pos: presetPositions[cameraPreset].clone(),
        target: presetTargets[cameraPreset].clone(),
      };
    }
  }, [cameraPreset]);

  useFrame(({ camera }, delta) => {
    cameraRef.position.copy(camera.position);
    if (controlsRef.current) {
      cameraRef.target.copy(controlsRef.current.target);
    }
    if (lerpingTo.current) {
      const { pos: targetPos, target: targetTarget } = lerpingTo.current;
      camera.position.lerp(targetPos, delta * 3);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetTarget, delta * 3);
        controlsRef.current.update();
      }
      if (camera.position.distanceTo(targetPos) < 0.05) {
        lerpingTo.current = null;
      }
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

/** Handles WebGL context loss/restore inside the Canvas */
function ContextLossHandler() {
  const { gl } = useThree();
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (e: Event) => {
      e.preventDefault();
      console.warn('[Scene3D] WebGL context lost');
      setContextLost(true);
    };
    const handleRestored = () => {
      console.info('[Scene3D] WebGL context restored');
      setContextLost(false);
    };
    canvas.addEventListener('webglcontextlost', handleLost);
    canvas.addEventListener('webglcontextrestored', handleRestored);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost);
      canvas.removeEventListener('webglcontextrestored', handleRestored);
    };
  }, [gl]);

  if (contextLost) {
    return null; // Canvas will auto-recover; the flag prevents further renders
  }
  return null;
}

function SceneContent() {
  const appMode = useAppStore((s) => s.appMode);
  const sunAzimuth = useAppStore((s) => s.environment.sunAzimuth);
  const sunElevation = useAppStore((s) => s.environment.sunElevation);
  const weatherCondition = useAppStore((s) => s.environment.weather.condition);
  const perf = useAppStore((s) => s.performance);

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

  const isNight = sunElevation < 0;
  const isTwilight = sunElevation >= 0 && sunElevation < 15;
  const ambientIntensity = isNight ? 0.1 : isTwilight ? 0.25 : (weatherCondition === 'cloudy' || weatherCondition === 'rain' ? 0.5 : 0.35);
  const ambientColor = isNight ? '#1a1a3e' : isTwilight ? '#ff9966' : '#b8c4d4';
  const sunIntensity = isNight ? 0 : (weatherCondition === 'cloudy' ? 0.4 : weatherCondition === 'rain' ? 0.2 : weatherCondition === 'snow' ? 0.3 : 1.2);

  const shadowMapSize = perf.quality === 'low' ? 512 : perf.quality === 'medium' ? 1024 : 2048;
  const showGrid = appMode === 'build';
  const enableShadows = perf.shadows && !isNight;

  return (
    <>
      <ContextLossHandler />
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight position={sunPos} intensity={sunIntensity} color="#ffd699" castShadow={enableShadows}
        shadow-mapSize-width={shadowMapSize} shadow-mapSize-height={shadowMapSize}
        shadow-camera-far={50} shadow-camera-left={-20} shadow-camera-right={20}
        shadow-camera-top={20} shadow-camera-bottom={-20} />
      {!isNight && perf.quality !== 'low' && <pointLight position={[0, 8, 0]} intensity={0.15} color="#4a9eff" />}

      <GroundPlane onPointerDown={() => {}} onPointerMove={() => {}} />

      {showGrid && (
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
  const shadows = useAppStore((s) => s.performance.shadows);
  const quality = useAppStore((s) => s.performance.quality);
  const dpr = quality === 'low' ? 1 : quality === 'medium' ? 1.5 : undefined;

  return (
    <Canvas
      shadows={shadows}
      camera={{ position: [0, 25, 0.01], fov: 45 }}
      style={{ background: 'transparent' }}
      gl={{ antialias: quality !== 'low', alpha: true }}
      dpr={dpr}
    >
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  );
}
