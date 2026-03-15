import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Html } from '@react-three/drei';
import React, { Suspense, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import { cameraRef, pendingFlyTo, clearPendingFlyTo } from '../lib/cameraRef';
import { findWallAtWorld, pointToSegment, snapToNode, generateId } from '../lib/buildUtils';
import { openingPresets } from '../lib/openingPresets';
import { getStats as getCacheStats } from '../lib/modelCache';

// ─── Phase 3.5: Adaptive frame throttle ───
// Reduces GPU load in standby/dashboard modes by skipping frames.
// vio = pause entirely, standby = ~10fps, dashboard = paused (canvas hidden), home/build = full speed

function FrameThrottle() {
  const appMode = useAppStore((s) => s.appMode);
  const standbyPhase = useAppStore((s) => s.standby.phase);
  const lastRender = useRef(0);

  useFrame((state, _delta) => {
    // Vio mode: near-black screen, no 3D needed — pause rendering
    if (appMode === 'standby' && standbyPhase === 'vio') {
      state.gl.setAnimationLoop(null);
      return;
    }

    // Standby mode: slow camera drift, only need ~10fps
    if (appMode === 'standby' && standbyPhase === 'standby') {
      const now = performance.now();
      if (now - lastRender.current < 100) return; // skip frame (~10fps)
      lastRender.current = now;
    }

    // home/build: full speed, no throttling
  });

  // Re-enable animation loop when leaving vio
  const prevVio = useRef(false);
  useEffect(() => {
    const isVio = appMode === 'standby' && standbyPhase === 'vio';
    if (prevVio.current && !isVio) {
      // Canvas will re-enable its own loop on next invalidation/render cycle
      // Force a state change to restart the loop
      const store = useAppStore.getState();
      useAppStore.setState({ ...store });
    }
    prevVio.current = isVio;
  }, [appMode, standbyPhase]);

  return null;
}

// Export cache stats getter for PerformanceHUD
export { getCacheStats };

import Walls3D from './build/Walls3D';
import InteractiveWalls3D from './build/InteractiveWalls3D';
import Floors3D from './build/Floors3D';
import Ceilings3D from './build/Ceilings3D';
import Stairs3D from './build/Stairs3D';
import ImportedHome3D from './build/ImportedHome3D';
import Props3D from './build/Props3D';
import GroundPlane from './build/GroundPlane';
import WallDrawing3D from './build/WallDrawing3D';
import WeatherEffects3D from './build/WeatherEffects3D';
import DeviceMarkers3D from './devices/DeviceMarkers3D';

import type { CameraPreset, StandbyCameraView, WallSegment, DeviceKind } from '../store/types';
import { clearAllCaches } from '../lib/modelCache';

// ─── Camera presets ───

const presetPositions: Record<CameraPreset, THREE.Vector3> = {
  free: new THREE.Vector3(12, 12, 12),
  topdown: new THREE.Vector3(0, 25, 0.01),
  angle: new THREE.Vector3(8, 7, 8),
  front: new THREE.Vector3(0, 6, 20),
};

const presetTargets: Record<CameraPreset, THREE.Vector3> = {
  free: new THREE.Vector3(0, 0, 0),
  topdown: new THREE.Vector3(0, 0, 0),
  angle: new THREE.Vector3(0, 0.5, 0),
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

// ─── Standby camera ───

function StandbyStaticCamera() {
  const cameraView = useAppStore((s) => s.standby.cameraView);
  const customPos = useAppStore((s) => s.standby.customPos);
  const customTarget = useAppStore((s) => s.standby.customTarget);
  const targetPosRef = useRef(new THREE.Vector3());
  const targetLookRef = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  useFrame(({ camera }, delta) => {
    const pos = cameraView === 'custom' && customPos ? customPos : standbyCameraPositions[cameraView] || standbyCameraPositions.standard;
    const target = cameraView === 'custom' && customTarget ? customTarget : standbyCameraTargets[cameraView] || standbyCameraTargets.standard;
    if (pos) targetPosRef.current.set(pos[0], pos[1], pos[2]);
    if (target) targetLookRef.current.set(target[0], target[1], target[2]);

    if (!initialized.current) {
      camera.position.copy(targetPosRef.current);
      currentLookAt.current.copy(targetLookRef.current);
      camera.lookAt(currentLookAt.current);
      initialized.current = true;
    } else {
      camera.position.lerp(targetPosRef.current, Math.min(1, delta * 3));
      currentLookAt.current.lerp(targetLookRef.current, Math.min(1, delta * 3));
      camera.lookAt(currentLookAt.current);
    }
  });

  return null;
}

// ─── Home/Dashboard interactive camera ───

function InteractiveCameraController() {
  const cameraPreset = useAppStore((s) => s.homeView.cameraPreset);
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
    if (!initialApplied.current) {
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
    const pos = customStartPos
      ? new THREE.Vector3(...customStartPos)
      : presetPositions.angle.clone();
    const target = customStartTarget
      ? new THREE.Vector3(...customStartTarget)
      : presetTargets.angle.clone();
    lerpingTo.current = { pos, target };
  }, [customStartPos, customStartTarget]);

  const presetMountedRef = useRef(false);
  useEffect(() => {
    if (cameraPreset === 'free') { presetMountedRef.current = true; return; }
    // On first mount, don't override saved custom position with default preset
    if (!presetMountedRef.current && customStartPos && cameraPreset === 'angle') {
      presetMountedRef.current = true;
      return;
    }
    presetMountedRef.current = true;
    lerpingTo.current = {
      pos: presetPositions[cameraPreset].clone(),
      target: presetTargets[cameraPreset].clone(),
    };
  }, [cameraPreset]);

  useFrame(({ camera }, delta) => {
    cameraRef.position.copy(camera.position);
    if (controlsRef.current) {
      cameraRef.target.copy(controlsRef.current.target);
    }
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
}

// ─── Build mode camera (right-click rotate) ───

function BuildCameraController({ enableRotate }: { enableRotate: boolean }) {
  const controlsRef = useRef<any>(null);
  const lerpingTo = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useFrame(({ camera }, delta) => {
    cameraRef.position.copy(camera.position);
    if (controlsRef.current) {
      cameraRef.target.copy(controlsRef.current.target);
    }
    // Handle flyTo requests (room navigation etc.)
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

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2.1}
      enableRotate={enableRotate}
      mouseButtons={{
        LEFT: undefined as any,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
    />
  );
}

// ─── Camera controller wrapper ───

function CameraController() {
  const appMode = useAppStore((s) => s.appMode);

  if (appMode === 'standby') return <StandbyStaticCamera />;
  if (appMode === 'build') return <BuildCameraControllerWrapper />;
  return <InteractiveCameraController key="interactive" />;
}

function BuildCameraControllerWrapper() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const wallDrawing = useAppStore((s) => s.build.wallDrawing);
  const enableRotate = activeTool !== 'wall' || !wallDrawing.isDrawing;
  return <BuildCameraController enableRotate={enableRotate} />;
}

// ─── Shared terrain ───

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

// ─── Kitchen fixtures (read-only for home/standby) ───

function SceneKitchenFixtures() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floor = floors.find((f) => f.id === activeFloorId);
  const fixtures = floor?.kitchenFixtures ?? [];
  const elevation = floor?.elevation ?? 0;
  if (fixtures.length === 0) return null;
  return (
    <group>
      {fixtures.map((fix) => (
        <group key={fix.id} position={[fix.position[0], elevation, fix.position[1]]} rotation={[0, -fix.rotation, 0]}>
          <SceneKitchenGeometry />
        </group>
      ))}
    </group>
  );
}

const SK_TW = 3.80; const SK_BD = 0.60; const SK_BH = 0.85; const SK_UH = 0.70; const SK_UB = 1.40; const SK_G = 0.005;
const SK_DW = 0.60; const SK_SW = 0.85; const SK_DWW = 0.60; const SK_STW = 0.60; const SK_FW = 0.60; const SK_PW = 0.55;
const SK_X0 = -SK_TW / 2;
const SK_DX = SK_X0 + SK_DW / 2; const SK_SX = SK_X0 + SK_DW + SK_SW / 2;
const SK_DWX = SK_X0 + SK_DW + SK_SW + SK_DWW / 2; const SK_STX = SK_X0 + SK_DW + SK_SW + SK_DWW + SK_STW / 2;
const SK_FX = SK_X0 + SK_DW + SK_SW + SK_DWW + SK_STW + SK_FW / 2;
const SK_PX = SK_X0 + SK_DW + SK_SW + SK_DWW + SK_STW + SK_FW + SK_PW / 2;

function SKH({ x, y, z, v }: { x: number; y: number; z: number; v?: boolean }) {
  return <mesh position={[x, y, z]}><boxGeometry args={v ? [0.02, 0.12, 0.02] : [0.10, 0.02, 0.02]} /><meshStandardMaterial color="#aaa" metalness={0.6} roughness={0.3} /></mesh>;
}

function SceneKitchenGeometry() {
  const fz = -SK_BD;
  return (
    <group>
      <mesh position={[SK_DX, SK_BH/2, -SK_BD/2]}><boxGeometry args={[SK_DW-SK_G, SK_BH, SK_BD]} /><meshStandardMaterial color="#f5f0e8" /></mesh>
      <mesh position={[SK_DX, SK_BH+0.015, -SK_BD/2]}><boxGeometry args={[SK_DW-SK_G, 0.03, SK_BD]} /><meshStandardMaterial color="#c8a86e" /></mesh>
      <mesh position={[SK_DX, SK_UB+SK_UH/2, -SK_BD/2]}><boxGeometry args={[SK_DW-SK_G, SK_UH, SK_BD]} /><meshStandardMaterial color="#f5f0e8" /></mesh>
      <mesh position={[SK_SX, SK_BH/2, -SK_BD/2]}><boxGeometry args={[SK_SW-SK_G, SK_BH, SK_BD]} /><meshStandardMaterial color="#f5f0e8" /></mesh>
      <mesh position={[SK_SX, SK_BH+0.015, -SK_BD/2]}><boxGeometry args={[SK_SW-SK_G, 0.03, SK_BD]} /><meshStandardMaterial color="#c8a86e" /></mesh>
      <mesh position={[SK_SX, SK_BH+0.015, -SK_BD/2]}><boxGeometry args={[0.45, 0.02, 0.35]} /><meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} /></mesh>
      <mesh position={[SK_SX, SK_UB+SK_UH/2, -SK_BD/2]}><boxGeometry args={[SK_SW-SK_G, SK_UH, SK_BD]} /><meshStandardMaterial color="#f5f0e8" /></mesh>
      <mesh position={[SK_DWX, SK_BH/2, -SK_BD/2]}><boxGeometry args={[SK_DWW-SK_G, SK_BH, SK_BD]} /><meshStandardMaterial color="#f5f0e8" /></mesh>
      <mesh position={[SK_DWX, SK_BH+0.015, -SK_BD/2]}><boxGeometry args={[SK_DWW-SK_G, 0.03, SK_BD]} /><meshStandardMaterial color="#c8a86e" /></mesh>
      <mesh position={[SK_DWX, SK_UB+SK_UH/2, -SK_BD/2]}><boxGeometry args={[SK_DWW-SK_G, SK_UH, SK_BD]} /><meshStandardMaterial color="#f5f0e8" /></mesh>
      <mesh position={[SK_STX, SK_BH/2, -SK_BD/2]}><boxGeometry args={[SK_STW-SK_G, SK_BH, SK_BD]} /><meshStandardMaterial color="#f5f0e8" /></mesh>
      <mesh position={[SK_STX, SK_BH+0.01, -SK_BD/2]}><boxGeometry args={[SK_STW-SK_G, 0.02, SK_BD]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[SK_STX, SK_UB+SK_UH/2, -SK_BD/2+0.05]}><boxGeometry args={[SK_STW, SK_UH*0.5, SK_BD*0.6]} /><meshStandardMaterial color="#888" metalness={0.5} roughness={0.3} /></mesh>
      <mesh position={[SK_FX, 1.05, -SK_BD/2]}><boxGeometry args={[SK_FW-SK_G, 2.10, SK_BD]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
      <mesh position={[SK_FX, 2.10+0.15, -SK_BD/2]}><boxGeometry args={[SK_FW-SK_G, 0.30, SK_BD]} /><meshStandardMaterial color="#f5f0e8" /></mesh>
      <mesh position={[SK_PX, 1.20, -SK_BD/2]}><boxGeometry args={[SK_PW-SK_G, 2.40, SK_BD]} /><meshStandardMaterial color="#f5f0e8" /></mesh>
      <SKH x={SK_DX} y={SK_BH*0.5} z={fz-0.01} />
      <SKH x={SK_DX} y={SK_UB+SK_UH*0.5} z={fz-0.01} />
      <SKH x={SK_SX-0.15} y={SK_BH*0.8} z={fz-0.01} v />
      <SKH x={SK_SX+0.15} y={SK_BH*0.8} z={fz-0.01} v />
      <SKH x={SK_SX-0.12} y={SK_UB+SK_UH*0.5} z={fz-0.01} />
      <SKH x={SK_SX+0.12} y={SK_UB+SK_UH*0.5} z={fz-0.01} />
      <SKH x={SK_DWX} y={SK_BH*0.8} z={fz-0.01} />
      <SKH x={SK_DWX} y={SK_UB+SK_UH*0.5} z={fz-0.01} />
      <SKH x={SK_FX+0.12} y={1.4} z={fz-0.01} v />
      <SKH x={SK_FX+0.12} y={0.4} z={fz-0.01} v />
      <SKH x={SK_FX} y={2.10+0.15} z={fz-0.01} />
      <SKH x={SK_PX+0.08} y={1.2} z={fz-0.01} v />
    </group>
  );
}

// ─── Build-mode interactive kitchen fixtures ───

const KLP_MS = 500; const KLP_THR = 5;

function BuildKitchenFixtures3D() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const selection = useAppStore((s) => s.build.selection);
  const setSelection = useAppStore((s) => s.setSelection);
  const updateKitchenFixture = useAppStore((s) => s.updateKitchenFixture);
  const removeKitchenFixture = useAppStore((s) => s.removeKitchenFixture);
  const addKitchenFixture = useAppStore((s) => s.addKitchenFixture);
  const pushUndo = useAppStore((s) => s.pushUndo);
  const activeTool = useAppStore((s) => s.build.activeTool);
  const { camera, gl, raycaster } = useThree();

  const floor = floors.find((f) => f.id === activeFloorId);
  const fixtures = floor?.kitchenFixtures ?? [];
  const elevation = floor?.elevation ?? 0;
  const canInteract = activeTool === 'select' || activeTool === 'furnish';

  return (
    <group>
      {fixtures.map((fix) => (
        <BuildKitchenFixtureInline
          key={fix.id}
          fix={fix}
          elevation={elevation}
          canInteract={canInteract}
          isSelected={selection.type === 'kitchen-fixture' && selection.id === fix.id}
          setSelection={setSelection}
          updateKitchenFixture={updateKitchenFixture}
          removeKitchenFixture={removeKitchenFixture}
          addKitchenFixture={addKitchenFixture}
          pushUndo={pushUndo}
          activeFloorId={activeFloorId}
          camera={camera}
          gl={gl}
          raycaster={raycaster}
        />
      ))}
    </group>
  );
}

function BuildKitchenFixtureInline({
  fix, elevation, canInteract, isSelected, setSelection,
  updateKitchenFixture, removeKitchenFixture, addKitchenFixture,
  pushUndo, activeFloorId, camera, gl, raycaster,
}: {
  fix: { id: string; floorId: string; position: [number, number]; rotation: number };
  elevation: number; canInteract: boolean; isSelected: boolean;
  setSelection: any; updateKitchenFixture: any; removeKitchenFixture: any;
  addKitchenFixture: any; pushUndo: any; activeFloorId: string | null;
  camera: THREE.Camera; gl: THREE.WebGLRenderer; raycaster: THREE.Raycaster;
}) {
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => { if (!isSelected) setShowQuickMenu(false); }, [isSelected]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowQuickMenu(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cancelLongPress = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } };

  const handlePointerDown = (e: any) => {
    if (!canInteract || e.nativeEvent.button !== 0) return;
    e.stopPropagation();
    setSelection({ type: 'kitchen-fixture', id: fix.id });
    setShowQuickMenu(false);
    longPressTriggered.current = false;
    pointerDownPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
    cancelLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true; setShowQuickMenu(true); setIsDragging(false); gl.domElement.style.cursor = '';
    }, KLP_MS);
    pushUndo();
    dragPlane.current.set(new THREE.Vector3(0, 1, 0), -elevation);
    dragOffset.current.set(e.point.x - fix.position[0], 0, e.point.z - fix.position[1]);
    setIsDragging(true); gl.domElement.style.cursor = 'grabbing';

    const onPointerMove = (ev: PointerEvent) => {
      if (pointerDownPos.current && longPressTimer.current) {
        const dx = ev.clientX - pointerDownPos.current.x; const dy = ev.clientY - pointerDownPos.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > KLP_THR) cancelLongPress();
      }
      if (longPressTriggered.current) return;
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(mouse, camera);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane.current, target);
      if (target && activeFloorId) updateKitchenFixture(activeFloorId, fix.id, { position: [target.x - dragOffset.current.x, target.z - dragOffset.current.z] });
    };
    const onPointerUp = () => { cancelLongPress(); setIsDragging(false); gl.domElement.style.cursor = ''; window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerup', onPointerUp); };
    window.addEventListener('pointermove', onPointerMove); window.addEventListener('pointerup', onPointerUp);
  };

  const handleQuickRotate = () => { if (activeFloorId) updateKitchenFixture(activeFloorId, fix.id, { rotation: fix.rotation + Math.PI / 4 }); };
  const handleQuickDuplicate = () => {
    if (!activeFloorId) return;
    const newId = generateId();
    addKitchenFixture(activeFloorId, { id: newId, floorId: activeFloorId, position: [fix.position[0] + 0.5, fix.position[1]], rotation: fix.rotation });
    setShowQuickMenu(false); setSelection({ type: 'kitchen-fixture', id: newId });
  };
  const handleQuickDelete = () => { if (!activeFloorId) return; removeKitchenFixture(activeFloorId, fix.id); setSelection({ type: null, id: null }); setShowQuickMenu(false); };

  const btnStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' };

  return (
    <group position={[fix.position[0], elevation, fix.position[1]]} rotation={[0, -fix.rotation, 0]} onPointerDown={handlePointerDown} onContextMenu={(e: any) => { e.nativeEvent?.preventDefault?.(); }}>
      <SceneKitchenGeometry />
      {isSelected && <mesh position={[0, 1.2, -SK_BD / 2]}><boxGeometry args={[SK_TW + 0.05, 2.5, SK_BD + 0.05]} /><meshStandardMaterial color="#3b82f6" transparent opacity={0.08} depthWrite={false} /></mesh>}
      {showQuickMenu && isSelected && (
        <Html center position={[0, 2.8, -SK_BD / 2]} style={{ pointerEvents: 'auto' }}>
          <div style={{ background: 'hsl(220 18% 13% / 0.95)', borderRadius: 12, padding: '6px 4px', display: 'flex', gap: 2, backdropFilter: 'blur(8px)', border: '1px solid hsl(220 10% 25% / 0.5)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={handleQuickRotate} style={btnStyle} onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(220 10% 25% / 0.5)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}><span style={{ fontSize: 16 }}>↻</span><span>Rotera</span></button>
            <button onClick={handleQuickDuplicate} style={btnStyle} onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(220 10% 25% / 0.5)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}><span style={{ fontSize: 16 }}>⊕</span><span>Duplicera</span></button>
            <button onClick={handleQuickDelete} style={{ ...btnStyle, color: '#ef4444' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(220 10% 25% / 0.5)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}><span style={{ fontSize: 16 }}>✕</span><span>Ta bort</span></button>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Build mode ground interactions ───

function BuildGroundInteractions() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const wallDrawing = useAppStore((s) => s.build.wallDrawing);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const activeFloor = useAppStore((s) => s.layout.floors.find((f) => f.id === s.layout.activeFloorId));
  const gridState = useAppStore((s) => s.build.grid);
  const setWallDrawing = useAppStore((s) => s.setWallDrawing);
  const addWall = useAppStore((s) => s.addWall);
  const setSelection = useAppStore((s) => s.setSelection);
  const pushUndo = useAppStore((s) => s.pushUndo);
  const addDevice = useAppStore((s) => s.addDevice);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const floors = useAppStore((s) => s.layout.floors);

  const [cursorPos, setCursorPos] = useState<[number, number] | null>(null);
  const [cursorSnapped, setCursorSnapped] = useState(false);
  const [cursorMidSnap, setCursorMidSnap] = useState(false);
  const [cursorAxisAligned, setCursorAxisAligned] = useState(false);

  const snapToGrid = useCallback(
    (x: number, z: number): [number, number] => {
      if (!gridState.enabled || gridState.snapMode === 'off') return [x, z];
      const s = gridState.sizeMeters;
      return [Math.round(x / s) * s, Math.round(z / s) * s];
    },
    [gridState]
  );

  const handleGroundPointerDown = useCallback(
    (point: THREE.Vector3, e: any) => {
      // ─── 3D opening placement ───
      if ((activeTool === 'door' || activeTool === 'window' || activeTool === 'garage-door') && activeFloorId) {
        e.stopPropagation();
        const fl = floors.find((f) => f.id === activeFloorId);
        const floorWalls = fl?.walls ?? [];
        const wall = findWallAtWorld(point.x, point.z, floorWalls, 0.5);
        if (wall) {
          const [dist, t] = pointToSegment(point.x, point.z, wall.from[0], wall.from[1], wall.to[0], wall.to[1]);
          if (dist < 0.5) {
            pushUndo();
            const presetId = (useAppStore.getState() as any)._selectedOpeningPreset;
            const preset = presetId ? openingPresets.find((p: any) => p.id === presetId) : null;
            const openingId = generateId();
            const openingType = activeTool === 'garage-door' ? 'garage-door' : activeTool;
            const addOpening = useAppStore.getState().addOpening;
            addOpening(activeFloorId, wall.id, {
              id: openingId,
              type: openingType as 'door' | 'window' | 'garage-door',
              offset: Math.max(0.05, Math.min(0.95, t)),
              width: preset?.width ?? (activeTool === 'door' ? 0.9 : activeTool === 'garage-door' ? 2.5 : 1.2),
              height: preset?.height ?? (activeTool === 'door' ? 2.1 : activeTool === 'garage-door' ? 2.2 : 1.2),
              sillHeight: preset?.sillHeight ?? (activeTool === 'window' ? 0.9 : 0),
              style: preset?.style,
            });
            setSelection({ type: 'opening', id: openingId });
            setBuildTool('select');
            useAppStore.setState({ _selectedOpeningPreset: null } as any);
          }
        }
        return;
      }

      if (activeTool.startsWith('place-') && activeFloorId) {
        e.stopPropagation();
        const kind = activeTool.replace('place-', '') as DeviceKind;
        const snapped = snapToGrid(point.x, point.z);
        const fl = floors.find((f) => f.id === activeFloorId);
        const elev = fl?.elevation ?? 0;
        const h = fl?.heightMeters ?? 2.5;
        let yPos = elev + 2.2;
        if (kind === 'light') yPos = elev + h - 0.1;
        else if (kind === 'light-fixture') yPos = elev + h - 0.1;
        else if (kind === 'switch' || kind === 'sensor') yPos = elev + 1.2;
        else if (kind === 'climate') yPos = elev + 1.5;
        else if (kind === 'media_screen') yPos = elev + 1.5;
        else if (kind === 'smart-outlet') yPos = elev + 0.4;

        const deviceData: any = {
          id: generateId(),
          kind,
          name: '',
          floorId: activeFloorId,
          surface: kind === 'light' || kind === 'light-fixture' ? 'ceiling' : kind === 'media_screen' ? 'free' : kind === 'smart-outlet' ? 'wall' : 'floor',
          position: [snapped[0], yPos, snapped[1]],
          rotation: [0, 0, 0],
        };
        if (kind === 'media_screen') {
          deviceData.scale = [1.2, 0.675, 1];
          deviceData.screenConfig = { aspectRatio: 16 / 9, uiStyle: 'minimal', showProgress: true };
        }
        addDevice(deviceData);
        setBuildTool('select');
        return;
      }

      if (activeTool === 'wall') {
        e.stopPropagation();
        let snapped = snapToGrid(point.x, point.z);
        const fl = floors.find((f) => f.id === activeFloorId);
        const floorWalls = fl?.walls ?? [];
        const nodeSnap = snapToNode(snapped, floorWalls, 0.25);
        snapped = nodeSnap.snapped;

        if (wallDrawing.isDrawing && wallDrawing.nodes.length >= 3 && activeFloorId) {
          const firstNode = wallDrawing.nodes[0];
          const distToFirst = Math.hypot(snapped[0] - firstNode[0], snapped[1] - firstNode[1]);
          if (distToFirst < 0.3) {
            pushUndo();
            const nodes = [...wallDrawing.nodes, firstNode];
            for (let i = 0; i < nodes.length - 1; i++) {
              const len = Math.hypot(nodes[i+1][0] - nodes[i][0], nodes[i+1][1] - nodes[i][1]);
              if (len < 0.05) continue;
              const wall: WallSegment = {
                id: generateId(),
                from: nodes[i],
                to: nodes[i + 1],
                height: activeFloor?.heightMeters ?? 2.5,
                thickness: 0.15,
                openings: [],
              };
              addWall(activeFloorId, wall);
            }
            setWallDrawing({ isDrawing: false, nodes: [] });
            setCursorPos(null);
            return;
          }
        }

        if (!wallDrawing.isDrawing) {
          setWallDrawing({ isDrawing: true, nodes: [snapped] });
        } else {
          setWallDrawing({ nodes: [...wallDrawing.nodes, snapped] });
        }
      } else if (activeTool === 'select') {
        setSelection({ type: null, id: null });
      } else {
        setBuildTool('select');
      }
    },
    [activeTool, wallDrawing, snapToGrid, setWallDrawing, setSelection, activeFloorId, activeFloor, addDevice, setBuildTool, floors, pushUndo, addWall]
  );

  const handleGroundPointerMove = useCallback(
    (point: THREE.Vector3) => {
      if (activeTool === 'wall') {
        let snapped = snapToGrid(point.x, point.z);
        const fl = floors.find((f) => f.id === activeFloorId);
        const floorWalls = fl?.walls ?? [];
        const nodeSnap = snapToNode(snapped, floorWalls, 0.25);
        snapped = nodeSnap.snapped;

        let isFirstNodeSnap = false;
        if (wallDrawing.isDrawing && wallDrawing.nodes.length >= 3) {
          const firstNode = wallDrawing.nodes[0];
          const distToFirst = Math.hypot(snapped[0] - firstNode[0], snapped[1] - firstNode[1]);
          if (distToFirst < 0.3) {
            snapped = firstNode;
            isFirstNodeSnap = true;
          }
        }

        let isAxisAligned = false;
        if (wallDrawing.isDrawing && wallDrawing.nodes.length > 0) {
          const lastNode = wallDrawing.nodes[wallDrawing.nodes.length - 1];
          const dx = snapped[0] - lastNode[0];
          const dz = snapped[1] - lastNode[1];
          const dist = Math.hypot(dx, dz);
          if (dist > 0.1) {
            const angleDeg = (Math.atan2(dz, dx) * 180 / Math.PI + 360) % 360;
            for (const target of [0, 90, 180, 270, 360]) {
              if (Math.abs(angleDeg - target) < 3) {
                isAxisAligned = true;
                if (target === 0 || target === 180 || target === 360) {
                  snapped = [snapped[0], lastNode[1]];
                } else {
                  snapped = [lastNode[0], snapped[1]];
                }
                break;
              }
            }
          }
        }

        setCursorPos(snapped);
        setCursorSnapped(nodeSnap.isSnapped || isFirstNodeSnap);
        setCursorMidSnap(!!nodeSnap.isMidSnap && !isFirstNodeSnap);
        setCursorAxisAligned(isAxisAligned);
      }
    },
    [activeTool, snapToGrid, floors, activeFloorId, wallDrawing]
  );

  return (
    <>
      <GroundPlane onPointerDown={handleGroundPointerDown} onPointerMove={handleGroundPointerMove} />
      <InteractiveWalls3D />
      <WallDrawing3D cursorPos={cursorPos} cursorSnapped={cursorSnapped} cursorMidSnap={cursorMidSnap} cursorAxisAligned={cursorAxisAligned} />
      <BuildKitchenFixtures3D />

      {gridState.enabled && (
        <Grid
          args={[100, 100]}
          cellSize={gridState.sizeMeters}
          cellThickness={0.5}
          cellColor="#2a2d35"
          sectionSize={gridState.sizeMeters * 10}
          sectionThickness={1}
          sectionColor="#3a3d45"
          fadeDistance={30}
          position={[0, 0, 0]}
        />
      )}

      {/* Origin crosshair */}
      <group>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.15, 0.2, 32]} />
          <meshBasicMaterial color="#ff4444" transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 0.03]} />
          <meshBasicMaterial color="#ff4444" transparent opacity={0.4} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[1, 0.03]} />
          <meshBasicMaterial color="#4444ff" transparent opacity={0.4} />
        </mesh>
      </group>
    </>
  );
}

// ─── Unified scene content ───

function UnifiedSceneContent({ onDeviceLongPress }: { onDeviceLongPress?: (id: string) => void }) {
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
  const enableShadows = perf.shadows && profile.shadowEnabled;
  const isBuild = appMode === 'build';

  return (
    <>
      {/* Shared lighting */}
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

      {/* Shared geometry */}
      <Floors3D />
      <Ceilings3D />
      <Stairs3D />
      <ImportedHome3D />
      <Props3D />
      <WeatherEffects3D />
      <InlineTerrainEnvironment3D />

      {/* Mode-specific scene elements */}
      {isBuild ? (
        <BuildGroundInteractions />
      ) : (
        <>
          <GroundPlane />
          <Walls3D />
          <SceneKitchenFixtures />

          {appMode === 'home' && (
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
        </>
      )}

      {/* Device markers — build mode gets buildMode prop, home gets longPress callback */}
      {isBuild ? (
        <DeviceMarkers3D buildMode />
      ) : (
        <DeviceMarkers3D onLongPress={onDeviceLongPress} />
      )}

      <Environment preset="night" />
      <CameraController />
      <FrameThrottle />
    </>
  );
}

// ─── Canvas wrapper with WebGL recovery ───

const MAX_RECOVERY = 3;

export default function PersistentScene3D({ onDeviceLongPress }: { onDeviceLongPress?: (id: string) => void }) {
  const shadows = useAppStore((s) => s.performance.shadows);
  const quality = useAppStore((s) => s.performance.quality);
  const tabletMode = useAppStore((s) => s.performance.tabletMode);
  const antialiasing = useAppStore((s) => s.performance.antialiasing);
  const toneMapping = useAppStore((s) => s.performance.toneMapping);
  const exposure = useAppStore((s) => s.performance.exposure);
  const appMode = useAppStore((s) => s.appMode);
  const buildCameraMode = useAppStore((s) => s.build.view.cameraMode);
  const activeTool = useAppStore((s) => s.build.activeTool);
  const wallDrawing = useAppStore((s) => s.build.wallDrawing);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const activeFloor = useAppStore((s) => s.layout.floors.find((f) => f.id === s.layout.activeFloorId));
  const addWall = useAppStore((s) => s.addWall);
  const setWallDrawing = useAppStore((s) => s.setWallDrawing);
  const pushUndo = useAppStore((s) => s.pushUndo);

  // Double-click to finish wall drawing (was on BuildScene3D wrapper div)
  const handleDoubleClick = useCallback(() => {
    if (appMode !== 'build') return;
    if (activeTool === 'wall' && wallDrawing.isDrawing && activeFloorId) {
      pushUndo();
      const nodes = [...wallDrawing.nodes];
      if (nodes.length >= 3) {
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (Math.hypot(last[0] - first[0], last[1] - first[1]) < 0.3) {
          nodes[nodes.length - 1] = first;
        }
      }
      for (let i = 0; i < nodes.length - 1; i++) {
        const len = Math.hypot(nodes[i+1][0] - nodes[i][0], nodes[i+1][1] - nodes[i][1]);
        if (len < 0.05) continue;
        const wall: WallSegment = {
          id: generateId(),
          from: nodes[i],
          to: nodes[i + 1],
          height: activeFloor?.heightMeters ?? 2.5,
          thickness: 0.15,
          openings: [],
        };
        addWall(activeFloorId, wall);
      }
      setWallDrawing({ isDrawing: false, nodes: [] });
    }
  }, [appMode, activeTool, wallDrawing, activeFloorId, activeFloor, pushUndo, addWall, setWallDrawing]);

  const dpr = tabletMode ? 0.75 : quality === 'low' ? 1 : quality === 'medium' ? 1.5 : undefined;

  const [recoveryCount, setRecoveryCount] = useState(0);
  const [recovering, setRecovering] = useState(false);
  const [failed, setFailed] = useState(false);
  const lastSuccessRef = useRef(Date.now());

  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    lastSuccessRef.current = Date.now();
    gl.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[PersistentScene3D] WebGL context lost — recovering...');
      // Clear model cache on context loss
      clearAllCaches();
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
  }, []);

  // Hide 3D canvas only when build is in topdown 2D mode (dashboard uses persistent canvas as background)
  const isHidden = appMode === 'build' && buildCameraMode === 'topdown';

  if (failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary/10 to-secondary/10 z-0">
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
    <div
      className="absolute inset-0 z-0"
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        visibility: isHidden ? 'hidden' : 'visible',
        pointerEvents: isHidden ? 'none' : 'auto',
      }}
    >
      {recovering && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground animate-pulse">Återställer 3D…</p>
        </div>
      )}
      <Canvas
        key={`persistent-${recoveryCount}`}
        shadows={shadows}
        camera={{ position: [8, 7, 8], fov: 45, near: 0.1, far: 500 }}
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
          <UnifiedSceneContent onDeviceLongPress={onDeviceLongPress} />
        </Suspense>
      </Canvas>
    </div>
  );
}
