import { Canvas, useThree } from '@react-three/fiber';
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

        setCursorPos(snapped);
        setCursorSnapped(nodeSnap.isSnapped || isFirstNodeSnap);
        setCursorMidSnap(!!nodeSnap.isMidSnap && !isFirstNodeSnap);
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
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight position={sunPos} intensity={sunIntensity} color="#ffd699" castShadow={enableShadows}
        shadow-mapSize-width={shadowMapSize} shadow-mapSize-height={shadowMapSize}
        shadow-camera-far={50} shadow-camera-left={-20} shadow-camera-right={20}
        shadow-camera-top={20} shadow-camera-bottom={-20} shadow-bias={-0.002} />
      {!isNight && perf.quality !== 'low' && <pointLight position={[0, 8, 0]} intensity={0.15} color="#4a9eff" />}

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
      <WallDrawing3D cursorPos={cursorPos} cursorSnapped={cursorSnapped} cursorMidSnap={cursorMidSnap} />
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
    <div className="w-full h-full relative" onDoubleClick={handleDoubleClick}>
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
