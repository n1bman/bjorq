/**
 * DashboardPreview3D — Lightweight interactive 3D canvas for dashboard cards.
 * Renders the home model (walls, floors, props, devices) with OrbitControls.
 * Shares the centralized model cache with PersistentScene3D.
 */

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Walls3D from '../build/Walls3D';
import Floors3D from '../build/Floors3D';
import Props3D from '../build/Props3D';
import ImportedHome3D from '../build/ImportedHome3D';
import DeviceMarkers3D from '../devices/DeviceMarkers3D';
import GroundPlane from '../build/GroundPlane';
import { ErrorBoundary } from '../build/ErrorBoundary3D';

function PreviewScene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <hemisphereLight args={['#b1e1ff', '#b97a20', 0.5]} />
      <directionalLight position={[8, 12, 6]} intensity={0.8} castShadow={false} />

      {/* Scene content */}
      <GroundPlane />
      <Walls3D />
      <Floors3D />
      <Suspense fallback={null}>
        <Props3D />
        <ImportedHome3D />
        <DeviceMarkers3D />
      </Suspense>

      {/* Controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.12}
        minDistance={2}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
}

interface DashboardPreview3DProps {
  className?: string;
}

export default function DashboardPreview3D({ className }: DashboardPreview3DProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-muted-foreground text-xs">3D ej tillgänglig</div>}>
        <Canvas
          shadows={false}
          camera={{ position: [10, 12, 10], fov: 45 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'default' }}
          dpr={[1, 1.5]}
          style={{ borderRadius: 'inherit' }}
        >
          <PreviewScene />
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
