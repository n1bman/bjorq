import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import React, { Suspense, useMemo, useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import { cameraRef } from '../lib/cameraRef';
import { pendingFlyTo, clearPendingFlyTo } from '../lib/cameraRef';
import Walls3D from './build/Walls3D';
import Floors3D from './build/Floors3D';

import Stairs3D from './build/Stairs3D';
import ImportedHome3D from './build/ImportedHome3D';
import Props3D from './build/Props3D';
import DeviceMarkers3D from './devices/DeviceMarkers3D';
import WeatherEffects3D from './build/WeatherEffects3D';
import Ceilings3D from './build/Ceilings3D';


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

const CameraController = React.forwardRef(function CameraController(_props, _ref) {
  const cameraPreset = useAppStore((s) => s.homeView.cameraPreset);
  const appMode = useAppStore((s) => s.appMode);
  const customStartPos = useAppStore((s) => s.homeView.customStartPos);
  const customStartTarget = useAppStore((s) => s.homeView.customStartTarget);
  const controlsRef = useRef<any>(null);
  const lerpingTo = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const initialApplied = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!initialApplied.current && (appMode === 'dashboard' || appMode === 'home')) {
      const pos = customStartPos
        ? new THREE.Vector3(...customStartPos)
        : presetPositions.angle.clone();
      const target = customStartTarget
        ? new THREE.Vector3(...customStartTarget)
        : presetTargets.angle.clone();
      lerpingTo.current = { pos, target };
      initialApplied.current = true;
    }
  }, []);

  useEffect(() => {
    if (!initialApplied.current) return;
    if (appMode === 'dashboard' || appMode === 'home') {
      const pos = customStartPos
        ? new THREE.Vector3(...customStartPos)
        : presetPositions.angle.clone();
      const target = customStartTarget
        ? new THREE.Vector3(...customStartTarget)
        : presetTargets.angle.clone();
      lerpingTo.current = { pos, target };
    }
  }, [customStartPos, customStartTarget]);

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
    // Check for external flyTo requests
    if (pendingFlyTo) {
      lerpingTo.current = { pos: pendingFlyTo.position, target: pendingFlyTo.target };
      clearPendingFlyTo();
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

  if (!ready) return null;

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
});


function SceneContent() {
  const appMode = useAppStore((s) => s.appMode);
  const sunAzimuth = useAppStore((s) => s.environment.sunAzimuth);
  const sunElevation = useAppStore((s) => s.environment.sunElevation);
  const profile = useAppStore((s) => s.environment.profile);
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

  const shadowMapSize = perf.quality === 'low' ? 512 : perf.quality === 'medium' ? 1024 : 2048;
  const showGrid = appMode === 'build';
  const enableShadows = perf.shadows && profile.shadowEnabled;

  return (
    <>
      <ambientLight
        intensity={profile.ambientIntensity}
        color={new THREE.Color(profile.ambientColor[0], profile.ambientColor[1], profile.ambientColor[2])}
      />
      <directionalLight
        position={sunPos}
        intensity={profile.sunIntensity}
        color={new THREE.Color(profile.sunColor[0], profile.sunColor[1], profile.sunColor[2])}
        castShadow={enableShadows}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={profile.shadowSoftness > 0.3 ? -0.003 : -0.002}
      />

      <hemisphereLight
        args={[
          new THREE.Color(profile.hemisphereSkyColor[0], profile.hemisphereSkyColor[1], profile.hemisphereSkyColor[2]),
          new THREE.Color(profile.hemisphereGroundColor[0], profile.hemisphereGroundColor[1], profile.hemisphereGroundColor[2]),
          profile.hemisphereIntensity,
        ]}
      />

      {profile.fogEnabled && (
        <fog
          attach="fog"
          args={[
            new THREE.Color(profile.fogColor[0], profile.fogColor[1], profile.fogColor[2]),
            profile.fogNear,
            profile.fogFar,
          ]}
        />
      )}

      <GroundPlane />

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
      <SceneKitchenFixtures />
      <WeatherEffects3D />
      <InlineTerrainEnvironment3D />
      <DeviceMarkers3D />

      {perf.environmentLight && <Environment preset="night" />}
      <CameraController />
    </>
  );
}

function InlineTerrainEnvironment3D() {
  const terrain = useAppStore((s) => s.terrain);
  if (!terrain?.enabled) return null;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]} receiveShadow>
        <circleGeometry args={[terrain.grassRadius || 20, 64]} />
        <meshStandardMaterial color={terrain.grassColor || '#4a7a3a'} roughness={0.95} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      {terrain.trees?.map((tree) => (
        <group key={tree.id} position={[tree.position[0], 0, tree.position[1]]} scale={tree.scale}>
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.15, 2, 8]} />
            <meshStandardMaterial color="#6b4226" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.8, 0]} castShadow>
            <sphereGeometry args={[1.2, 12, 12]} />
            <meshStandardMaterial color="#3a6b2a" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const MAX_RECOVERY = 3;

export default function Scene3D() {
  const shadows = useAppStore((s) => s.performance.shadows);
  const quality = useAppStore((s) => s.performance.quality);
  const postprocessing = useAppStore((s) => s.performance.postprocessing);
  const tabletMode = useAppStore((s) => s.performance.tabletMode);
  const antialiasing = useAppStore((s) => s.performance.antialiasing);
  const toneMapping = useAppStore((s) => s.performance.toneMapping);
  const exposure = useAppStore((s) => s.performance.exposure);
  const dpr = tabletMode ? 0.75 : quality === 'low' ? 1 : quality === 'medium' ? 1.5 : undefined;

  const [recoveryCount, setRecoveryCount] = useState(0);
  const [recovering, setRecovering] = useState(false);
  const [failed, setFailed] = useState(false);
  const lastSuccessRef = useRef(Date.now());

  const handleCreated = ({ gl }: { gl: THREE.WebGLRenderer }) => {
    lastSuccessRef.current = Date.now();
    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[Scene3D] WebGL context lost — recovering...');
      const elapsed = Date.now() - lastSuccessRef.current;
      setRecoveryCount((prev) => {
        const next = elapsed > 10000 ? 1 : prev + 1;
        if (next > MAX_RECOVERY) {
          setFailed(true);
          return prev;
        }
        setRecovering(true);
        const delay = Math.min(1000 * Math.pow(2, next - 1), 4000);
        setTimeout(() => {
          setRecovering(false);
        }, delay);
        return next;
      });
    });
  };

  const canvasKey = `${quality}-${shadows}-${postprocessing}-${tabletMode}-${antialiasing}-${toneMapping}-${recoveryCount}`;

  if (failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary/10 to-secondary/10">
        <p className="text-sm text-muted-foreground">3D-scenen kunde inte startas</p>
        <button
          onClick={() => { setFailed(false); setRecoveryCount(0); lastSuccessRef.current = Date.now(); }}
          className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Försök igen
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {recovering && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground animate-pulse">Återställer 3D…</p>
        </div>
      )}
      <Canvas
        key={canvasKey}
        shadows={shadows}
        camera={{ position: [0, 25, 0.01], fov: 45, near: 0.1, far: 500 }}
        style={{ background: 'transparent' }}
        gl={{
          antialias: antialiasing && !tabletMode,
          alpha: true,
          toneMapping: toneMapping ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping,
          toneMappingExposure: exposure,
        }}
        dpr={dpr}
        onCreated={handleCreated}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}