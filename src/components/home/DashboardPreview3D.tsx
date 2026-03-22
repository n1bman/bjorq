import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Walls3D from '../build/Walls3D';
import Floors3D from '../build/Floors3D';
import Props3D from '../build/Props3D';
import ImportedHome3D from '../build/ImportedHome3D';
import DeviceMarkers3D from '../devices/DeviceMarkers3D';
import GroundPlane from '../build/GroundPlane';
import WeatherEffects3D from '../build/WeatherEffects3D';
import { ErrorBoundary } from '../build/ErrorBoundary3D';
import { useAppStore } from '../../store/useAppStore';

/** Shared camera state exposed to parent via mutable ref */
export interface PreviewCameraState {
  position: [number, number, number];
  target: [number, number, number];
}

function CameraTracker({ stateRef }: { stateRef: React.MutableRefObject<PreviewCameraState> }) {
  const controlsRef = useThree((s) => (s as any).controls);
  useFrame(({ camera }) => {
    stateRef.current.position = [camera.position.x, camera.position.y, camera.position.z];
    if (controlsRef && 'target' in controlsRef) {
      const t = (controlsRef as any).target;
      stateRef.current.target = [t.x, t.y, t.z];
    }
  });
  return null;
}

function PreviewTerrainEnvironment3D() {
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

function getPreviewDpr(quality: 'low' | 'medium' | 'high', tabletMode: boolean): [number, number] {
  if (tabletMode) return [1, 1.2];
  if (quality === 'low') return [1, 1.2];
  if (quality === 'medium') return [1, 1.5];
  return [1, 2];
}

function PreviewScene({ stateRef }: { stateRef: React.MutableRefObject<PreviewCameraState> }) {
  const sunAzimuth = useAppStore((s) => s.environment.sunAzimuth);
  const sunElevation = useAppStore((s) => s.environment.sunElevation);
  const profile = useAppStore((s) => s.environment.profile);
  const perf = useAppStore((s) => s.performance);

  const sunPos = useMemo(() => {
    const azRad = (sunAzimuth * Math.PI) / 180;
    const elRad = (sunElevation * Math.PI) / 180;
    const dist = 12;
    return [
      dist * Math.cos(elRad) * Math.sin(azRad),
      Math.max(dist * Math.sin(elRad), 1),
      dist * Math.cos(elRad) * Math.cos(azRad),
    ] as [number, number, number];
  }, [sunAzimuth, sunElevation]);

  const shadowMapSize = perf.quality === 'low' ? 512 : perf.quality === 'medium' ? 1024 : 2048;
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
        shadow-camera-far={60}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.001}
        shadow-normalBias={0.02}
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
      <Walls3D />
      <Floors3D />
      <PreviewTerrainEnvironment3D />
      <WeatherEffects3D />
      <Suspense fallback={null}>
        <Props3D />
        <ImportedHome3D />
        <DeviceMarkers3D />
      </Suspense>

      <CameraTracker stateRef={stateRef} />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.12}
        minDistance={2}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
}

interface DashboardPreview3DProps {
  className?: string;
  /** Mutable ref that will be updated each frame with the preview camera's position/target */
  cameraStateRef?: React.MutableRefObject<PreviewCameraState>;
}

export default function DashboardPreview3D({ className, cameraStateRef }: DashboardPreview3DProps) {
  const internalRef = useRef<PreviewCameraState>({ position: [10, 12, 10], target: [0, 0, 0] });
  const perf = useAppStore((s) => s.performance);
  const profile = useAppStore((s) => s.environment.profile);
  const stateRef = cameraStateRef ?? internalRef;
  const dpr = getPreviewDpr(perf.quality, perf.tabletMode);

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-muted-foreground text-xs">3D ej tillgänglig</div>}>
        <Canvas
          shadows={perf.shadows && profile.shadowEnabled}
          camera={{ position: [10, 12, 10], fov: 45 }}
          gl={{ antialias: perf.antialiasing, alpha: false, powerPreference: 'default' }}
          dpr={dpr}
          style={{ borderRadius: 'inherit' }}
        >
          <PreviewScene stateRef={stateRef} />
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
