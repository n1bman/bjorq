import { Canvas, useThree } from '@react-three/fiber';
// @ts-ignore - Html import
import { Html } from '@react-three/drei';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Suspense, useRef, useState, useCallback, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { findWallAtWorld, pointToSegment, snapToNode, generateId } from '../../lib/buildUtils';
import { openingPresets } from '../../lib/openingPresets';
import GroundPlane from './GroundPlane';
import WallDrawing3D from './WallDrawing3D';
import InteractiveWalls3D from './InteractiveWalls3D';
import Floors3D from './Floors3D';

import Stairs3D from './Stairs3D';
import ImportedHome3D from './ImportedHome3D';
import Props3D from './Props3D';

import WeatherEffects3D from './WeatherEffects3D';
import Ceilings3D from './Ceilings3D';

import DeviceMarkers3D from '../devices/DeviceMarkers3D';
import { useAppStore } from '../../store/useAppStore';
import type { WallSegment, DeviceKind } from '../../store/types';

/* ContextLossHandler removed — recovery handled at Canvas level */

function SceneContent() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const wallDrawing = useAppStore((s) => s.build.wallDrawing);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const activeFloor = useAppStore((s) => s.layout.floors.find((f) => f.id === s.layout.activeFloorId));
  const gridState = useAppStore((s) => s.build.grid);
  const sunAzimuth = useAppStore((s) => s.environment.sunAzimuth);
  const sunElevation = useAppStore((s) => s.environment.sunElevation);
  const profile = useAppStore((s) => s.environment.profile);
  const perf = useAppStore((s) => s.performance);

  // Calculate sun position from azimuth and elevation
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

  const enableShadows = perf.shadows && profile.shadowEnabled;
  const shadowMapSize = perf.quality === 'low' ? 512 : perf.quality === 'medium' ? 1024 : 2048;

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
  const controlsRef = useRef<any>(null);

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
      // ─── 3D opening placement (door/window/garage-door) ───
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
        else if (kind === 'switch' || kind === 'sensor') yPos = elev + 1.2;
        else if (kind === 'climate') yPos = elev + 1.5;
        else if (kind === 'media_screen') yPos = elev + 1.5;

        const deviceData: any = {
          id: generateId(),
          kind,
          name: '',
          floorId: activeFloorId,
          surface: kind === 'light' ? 'ceiling' : kind === 'media_screen' ? 'free' : 'floor',
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
        // Node-snap to existing wall endpoints
        const fl = floors.find((f) => f.id === activeFloorId);
        const floorWalls = fl?.walls ?? [];
        const nodeSnap = snapToNode(snapped, floorWalls, 0.25);
        snapped = nodeSnap.snapped;

        // Auto-close: if we have ≥3 nodes and click near the first node, close the loop
        if (wallDrawing.isDrawing && wallDrawing.nodes.length >= 3 && activeFloorId) {
          const firstNode = wallDrawing.nodes[0];
          const distToFirst = Math.hypot(snapped[0] - firstNode[0], snapped[1] - firstNode[1]);
          if (distToFirst < 0.3) {
            pushUndo();
            const nodes = [...wallDrawing.nodes, firstNode];
            for (let i = 0; i < nodes.length - 1; i++) {
              const len = Math.hypot(nodes[i+1][0] - nodes[i][0], nodes[i+1][1] - nodes[i][1]);
              if (len < 0.05) continue; // skip zero-length
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
        // Auto-switch to select for non-placement tools clicking ground
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

        // Snap to first node for auto-close feedback
        let isFirstNodeSnap = false;
        if (wallDrawing.isDrawing && wallDrawing.nodes.length >= 3) {
          const firstNode = wallDrawing.nodes[0];
          const distToFirst = Math.hypot(snapped[0] - firstNode[0], snapped[1] - firstNode[1]);
          if (distToFirst < 0.3) {
            snapped = firstNode;
            isFirstNodeSnap = true;
          }
        }

        // 90° axis-aligned snapping
        let isAxisAligned = false;
        if (wallDrawing.isDrawing && wallDrawing.nodes.length > 0) {
          const lastNode = wallDrawing.nodes[wallDrawing.nodes.length - 1];
          const dx = snapped[0] - lastNode[0];
          const dz = snapped[1] - lastNode[1];
          const dist = Math.hypot(dx, dz);
          if (dist > 0.1) {
            const angleDeg = (Math.atan2(dz, dx) * 180 / Math.PI + 360) % 360;
            // Check if within ±3° of 0/90/180/270
            for (const target of [0, 90, 180, 270, 360]) {
              if (Math.abs(angleDeg - target) < 3) {
                isAxisAligned = true;
                // Snap to exact axis
                if (target === 0 || target === 180 || target === 360) {
                  snapped = [snapped[0], lastNode[1]]; // lock Z
                } else {
                  snapped = [lastNode[0], snapped[1]]; // lock X
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

  const handleDoubleClick = useCallback(() => {
    if (activeTool === 'wall' && wallDrawing.isDrawing && activeFloorId) {
      pushUndo();
      let nodes = [...wallDrawing.nodes];
      // Auto-close if last node is near first node
      if (nodes.length >= 3) {
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const distToFirst = Math.hypot(last[0] - first[0], last[1] - first[1]);
        if (distToFirst < 0.3) {
          nodes[nodes.length - 1] = first; // snap last to first
        }
      }
      for (let i = 0; i < nodes.length - 1; i++) {
        const len = Math.hypot(nodes[i+1][0] - nodes[i][0], nodes[i+1][1] - nodes[i][1]);
        if (len < 0.05) continue; // skip zero-length
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
    }
  }, [activeTool, wallDrawing, activeFloorId, activeFloor, pushUndo, addWall, setWallDrawing]);

  const enableRotate = activeTool !== 'wall' || !wallDrawing.isDrawing;

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
        shadow-camera-far={50} shadow-camera-left={-20} shadow-camera-right={20}
        shadow-camera-top={20} shadow-camera-bottom={-20}
        shadow-bias={profile.shadowSoftness > 0.3 ? -0.003 : -0.002}
      />
      <hemisphereLight
        args={[
          new THREE.Color(profile.hemisphereSkyColor[0], profile.hemisphereSkyColor[1], profile.hemisphereSkyColor[2]),
          new THREE.Color(profile.hemisphereGroundColor[0], profile.hemisphereGroundColor[1], profile.hemisphereGroundColor[2]),
          profile.hemisphereIntensity,
        ]}
      />

      <GroundPlane onPointerDown={handleGroundPointerDown} onPointerMove={handleGroundPointerMove} />

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

      <InteractiveWalls3D />
      <Floors3D />
      <Ceilings3D />
      <Stairs3D />
      <ImportedHome3D />
      <Props3D />
      <KitchenFixtures3D />
      <WallDrawing3D cursorPos={cursorPos} cursorSnapped={cursorSnapped} cursorMidSnap={cursorMidSnap} cursorAxisAligned={cursorAxisAligned} />
      <WeatherEffects3D />
      <InlineTerrain3D />
      <DeviceMarkers3D buildMode />

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

      <Environment preset="night" />
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
    </>
  );
}

function InlineTerrain3D() {
  const terrain = useAppStore((s) => s.terrain);
  if (!terrain?.enabled) return null;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[terrain.grassRadius || 20, 64]} />
        <meshStandardMaterial color={terrain.grassColor || '#4a7a3a'} roughness={0.95} polygonOffset polygonOffsetFactor={-0.5} polygonOffsetUnits={-0.5} />
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

export default function BuildScene3D() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const wallDrawing = useAppStore((s) => s.build.wallDrawing);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const activeFloor = useAppStore((s) => s.layout.floors.find((f) => f.id === s.layout.activeFloorId));
  const setWallDrawing = useAppStore((s) => s.setWallDrawing);
  const addWall = useAppStore((s) => s.addWall);
  const pushUndo = useAppStore((s) => s.pushUndo);

  const [recoveryCount, setRecoveryCount] = useState(0);
  const [recovering, setRecovering] = useState(false);
  const [failed, setFailed] = useState(false);
  const lastSuccessRef = useRef(Date.now());

  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    lastSuccessRef.current = Date.now();
    gl.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[BuildScene3D] WebGL context lost — recovering...');
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

  const handleDoubleClick = useCallback(() => {
    if (activeTool === 'wall' && wallDrawing.isDrawing && activeFloorId) {
      pushUndo();
      let nodes = [...wallDrawing.nodes];
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
  }, [activeTool, wallDrawing, activeFloorId, activeFloor, pushUndo, addWall, setWallDrawing]);

  const perfShadows = useAppStore((s) => s.performance.shadows);
  const perfQuality = useAppStore((s) => s.performance.quality);
  const perfTablet = useAppStore((s) => s.performance.tabletMode);
  const dpr = perfTablet ? 0.75 : perfQuality === 'low' ? 1 : perfQuality === 'medium' ? 1.5 : undefined;

  const canvasKey = `build-${perfQuality}-${perfShadows}-${recoveryCount}`;

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
    <div className="w-full h-full relative" onDoubleClick={handleDoubleClick} onContextMenu={(e) => e.preventDefault()}>
      <Canvas
        key={canvasKey}
        shadows={perfShadows}
        camera={{ position: [12, 12, 12], fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: perfQuality !== 'low', alpha: true }}
        dpr={dpr}
        onCreated={handleCreated}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
      {recovering && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
          <p className="text-sm text-muted-foreground animate-pulse">Återställer 3D…</p>
        </div>
      )}
    </div>
  );
}

/* ─── Inline KitchenFixtures3D ─── */
const KITCHEN_TOTAL_W = 3.80;
const KITCHEN_BASE_D = 0.60;
const KITCHEN_BASE_H = 0.85;
const KITCHEN_UPPER_H = 0.70;
const KITCHEN_UPPER_BOT = 1.40;
const KITCHEN_GAP = 0.005;
const KITCHEN_DRAWER_W = 0.60;
const KITCHEN_SINK_W = 0.85;
const KITCHEN_DW_W = 0.60;
const KITCHEN_STOVE_W = 0.60;
const KITCHEN_FRIDGE_W = 0.60;
const KITCHEN_PANTRY_W = 0.55;
const KX0 = -KITCHEN_TOTAL_W / 2;
const KDRAWER_X = KX0 + KITCHEN_DRAWER_W / 2;
const KSING_X = KX0 + KITCHEN_DRAWER_W + KITCHEN_SINK_W / 2;
const KDW_X = KX0 + KITCHEN_DRAWER_W + KITCHEN_SINK_W + KITCHEN_DW_W / 2;
const KSTOVE_X = KX0 + KITCHEN_DRAWER_W + KITCHEN_SINK_W + KITCHEN_DW_W + KITCHEN_STOVE_W / 2;
const KFRIDGE_X = KX0 + KITCHEN_DRAWER_W + KITCHEN_SINK_W + KITCHEN_DW_W + KITCHEN_STOVE_W + KITCHEN_FRIDGE_W / 2;
const KPANTRY_X = KX0 + KITCHEN_DRAWER_W + KITCHEN_SINK_W + KITCHEN_DW_W + KITCHEN_STOVE_W + KITCHEN_FRIDGE_W + KITCHEN_PANTRY_W / 2;
const KC_CAB = '#f5f0e8'; const KC_CTR = '#c8a86e'; const KC_MET = '#888888'; const KC_DRK = '#333333'; const KC_FRG = '#e8e8e8'; const KC_HDL = '#aaaaaa';
const KLP_MS = 500; const KLP_THR = 5;

function KHandle({ x, y, z, vertical }: { x: number; y: number; z: number; vertical?: boolean }) {
  return <mesh position={[x, y, z]}><boxGeometry args={vertical ? [0.02, 0.12, 0.02] : [0.10, 0.02, 0.02]} /><meshStandardMaterial color={KC_HDL} metalness={0.6} roughness={0.3} /></mesh>;
}

function KitchenGeometry() {
  const fz = -KITCHEN_BASE_D;
  return (
    <group>
      <mesh position={[KDRAWER_X, KITCHEN_BASE_H / 2, -KITCHEN_BASE_D / 2]}><boxGeometry args={[KITCHEN_DRAWER_W - KITCHEN_GAP, KITCHEN_BASE_H, KITCHEN_BASE_D]} /><meshStandardMaterial color={KC_CAB} /></mesh>
      {[0.15, 0.42, 0.68].map((dy, i) => (<group key={`d${i}`}><mesh position={[KDRAWER_X, dy, fz - 0.005]}><boxGeometry args={[KITCHEN_DRAWER_W - 0.04, 0.20, 0.008]} /><meshStandardMaterial color={KC_CAB} /></mesh><KHandle x={KDRAWER_X} y={dy} z={fz - 0.02} /></group>))}
      <mesh position={[KDRAWER_X, KITCHEN_BASE_H + 0.015, -KITCHEN_BASE_D / 2]}><boxGeometry args={[KITCHEN_DRAWER_W - KITCHEN_GAP, 0.03, KITCHEN_BASE_D]} /><meshStandardMaterial color={KC_CTR} /></mesh>
      <mesh position={[KDRAWER_X, KITCHEN_UPPER_BOT + KITCHEN_UPPER_H / 2, -KITCHEN_BASE_D / 2]}><boxGeometry args={[KITCHEN_DRAWER_W - KITCHEN_GAP, KITCHEN_UPPER_H, KITCHEN_BASE_D]} /><meshStandardMaterial color={KC_CAB} /></mesh>
      <KHandle x={KDRAWER_X} y={KITCHEN_UPPER_BOT + KITCHEN_UPPER_H / 2} z={fz - 0.01} />
      <mesh position={[KSING_X, KITCHEN_BASE_H / 2, -KITCHEN_BASE_D / 2]}><boxGeometry args={[KITCHEN_SINK_W - KITCHEN_GAP, KITCHEN_BASE_H, KITCHEN_BASE_D]} /><meshStandardMaterial color={KC_CAB} /></mesh>
      <KHandle x={KSING_X - 0.15} y={0.76} z={fz - 0.01} vertical /><KHandle x={KSING_X + 0.15} y={0.76} z={fz - 0.01} vertical />
      <mesh position={[KSING_X, KITCHEN_BASE_H + 0.015, -KITCHEN_BASE_D / 2]}><boxGeometry args={[KITCHEN_SINK_W - KITCHEN_GAP, 0.03, KITCHEN_BASE_D]} /><meshStandardMaterial color={KC_CTR} /></mesh>
      <mesh position={[KSING_X, KITCHEN_BASE_H + 0.015, -KITCHEN_BASE_D / 2]}><boxGeometry args={[0.45, 0.02, 0.35]} /><meshStandardMaterial color={KC_MET} metalness={0.7} roughness={0.2} /></mesh>
      <mesh position={[KSING_X, KITCHEN_BASE_H + 0.15, -0.08]}><boxGeometry args={[0.03, 0.25, 0.03]} /><meshStandardMaterial color={KC_MET} metalness={0.7} roughness={0.2} /></mesh>
      <mesh position={[KSING_X, KITCHEN_BASE_H + 0.27, -KITCHEN_BASE_D / 2 + 0.05]}><boxGeometry args={[0.02, 0.02, 0.18]} /><meshStandardMaterial color={KC_MET} metalness={0.7} roughness={0.2} /></mesh>
      <mesh position={[KSING_X, KITCHEN_UPPER_BOT + KITCHEN_UPPER_H / 2, -KITCHEN_BASE_D / 2]}><boxGeometry args={[KITCHEN_SINK_W - KITCHEN_GAP, KITCHEN_UPPER_H, KITCHEN_BASE_D]} /><meshStandardMaterial color={KC_CAB} /></mesh>
      <KHandle x={KSING_X - 0.12} y={KITCHEN_UPPER_BOT + KITCHEN_UPPER_H / 2} z={fz - 0.01} /><KHandle x={KSING_X + 0.12} y={KITCHEN_UPPER_BOT + KITCHEN_UPPER_H / 2} z={fz - 0.01} />
      <mesh position={[KDW_X, KITCHEN_BASE_H / 2, -KITCHEN_BASE_D / 2]}><boxGeometry args={[KITCHEN_DW_W - KITCHEN_GAP, KITCHEN_BASE_H, KITCHEN_BASE_D]} /><meshStandardMaterial color={KC_CAB} /></mesh>
      <mesh position={[KDW_X, 0.42, fz - 0.005]}><boxGeometry args={[KITCHEN_DW_W - 0.04, 0.65, 0.008]} /><meshStandardMaterial color={KC_FRG} /></mesh>
      <KHandle x={KDW_X} y={0.76} z={fz - 0.02} />
      <mesh position={[KDW_X, KITCHEN_BASE_H + 0.015, -KITCHEN_BASE_D / 2]}><boxGeometry args={[KITCHEN_DW_W - KITCHEN_GAP, 0.03, KITCHEN_BASE_D]} /><meshStandardMaterial color={KC_CTR} /></mesh>
      <mesh position={[KDW_X, KITCHEN_UPPER_BOT + KITCHEN_UPPER_H / 2, -KITCHEN_BASE_D / 2]}><boxGeometry args={[KITCHEN_DW_W - KITCHEN_GAP, KITCHEN_UPPER_H, KITCHEN_BASE_D]} /><meshStandardMaterial color={KC_CAB} /></mesh>
      <KHandle x={KDW_X} y={KITCHEN_UPPER_BOT + KITCHEN_UPPER_H / 2} z={fz - 0.01} />
      <mesh position={[KSTOVE_X, KITCHEN_BASE_H / 2, -KITCHEN_BASE_D / 2]}><boxGeometry args={[KITCHEN_STOVE_W - KITCHEN_GAP, KITCHEN_BASE_H, KITCHEN_BASE_D]} /><meshStandardMaterial color={KC_CAB} /></mesh>
      <mesh position={[KSTOVE_X, 0.35, fz - 0.005]}><boxGeometry args={[KITCHEN_STOVE_W - 0.06, 0.50, 0.01]} /><meshStandardMaterial color={KC_DRK} roughness={0.2} metalness={0.3} /></mesh>
      <KHandle x={KSTOVE_X} y={0.62} z={fz - 0.02} />
      <mesh position={[KSTOVE_X, KITCHEN_BASE_H + 0.01, -KITCHEN_BASE_D / 2]}><boxGeometry args={[KITCHEN_STOVE_W - KITCHEN_GAP, 0.02, KITCHEN_BASE_D]} /><meshStandardMaterial color={KC_DRK} /></mesh>
      {[[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]].map(([bx, bz], i) => (<mesh key={`b${i}`} position={[KSTOVE_X + bx, KITCHEN_BASE_H + 0.025, -KITCHEN_BASE_D / 2 + bz]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.04, 0.06, 16]} /><meshStandardMaterial color="#555" /></mesh>))}
      <mesh position={[KSTOVE_X, KITCHEN_UPPER_BOT + KITCHEN_UPPER_H / 2, -KITCHEN_BASE_D / 2 + 0.05]}><boxGeometry args={[KITCHEN_STOVE_W, KITCHEN_UPPER_H * 0.5, KITCHEN_BASE_D * 0.6]} /><meshStandardMaterial color={KC_MET} metalness={0.5} roughness={0.3} /></mesh>
      <mesh position={[KFRIDGE_X, 1.05, -KITCHEN_BASE_D / 2]}><boxGeometry args={[KITCHEN_FRIDGE_W - KITCHEN_GAP, 2.10, KITCHEN_BASE_D]} /><meshStandardMaterial color={KC_FRG} /></mesh>
      <KHandle x={KFRIDGE_X + 0.12} y={1.40} z={fz - 0.01} vertical /><KHandle x={KFRIDGE_X + 0.12} y={0.40} z={fz - 0.01} vertical />
      <mesh position={[KFRIDGE_X, 2.10 + 0.15, -KITCHEN_BASE_D / 2]}><boxGeometry args={[KITCHEN_FRIDGE_W - KITCHEN_GAP, 0.30, KITCHEN_BASE_D]} /><meshStandardMaterial color={KC_CAB} /></mesh>
      <KHandle x={KFRIDGE_X} y={2.10 + 0.15} z={fz - 0.01} />
      <mesh position={[KPANTRY_X, 1.20, -KITCHEN_BASE_D / 2]}><boxGeometry args={[KITCHEN_PANTRY_W - KITCHEN_GAP, 2.40, KITCHEN_BASE_D]} /><meshStandardMaterial color={KC_CAB} /></mesh>
      <KHandle x={KPANTRY_X + 0.08} y={1.20} z={fz - 0.01} vertical />
    </group>
  );
}

function KitchenFixtures3D() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const selection = useAppStore((s) => s.build.selection);
  const setSelection = useAppStore((s) => s.setSelection);
  const updateKitchenFixture = useAppStore((s) => s.updateKitchenFixture);
  const removeKitchenFixture = useAppStore((s) => s.removeKitchenFixture);
  const addKitchenFixture = useAppStore((s) => s.addKitchenFixture);
  const pushUndo = useAppStore((s) => s.pushUndo);
  const appMode = useAppStore((s) => s.appMode);
  const activeTool = useAppStore((s) => s.build.activeTool);
  const { camera, gl, raycaster } = useThree();

  const floor = floors.find((f) => f.id === activeFloorId);
  const fixtures = floor?.kitchenFixtures ?? [];
  const elevation = floor?.elevation ?? 0;
  const canInteract = appMode === 'build' && (activeTool === 'select' || activeTool === 'furnish');

  return (
    <group>
      {fixtures.map((fix) => (
        <KitchenFixtureInline
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

function KitchenFixtureInline({
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
      <KitchenGeometry />
      {isSelected && <mesh position={[0, 1.2, -KITCHEN_BASE_D / 2]}><boxGeometry args={[KITCHEN_TOTAL_W + 0.05, 2.5, KITCHEN_BASE_D + 0.05]} /><meshStandardMaterial color="#3b82f6" transparent opacity={0.08} depthWrite={false} /></mesh>}
      {showQuickMenu && isSelected && (
        <Html center position={[0, 2.8, -KITCHEN_BASE_D / 2]} style={{ pointerEvents: 'auto' }}>
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
