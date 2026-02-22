import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Suspense, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import GroundPlane from './GroundPlane';
import WallDrawing3D from './WallDrawing3D';
import InteractiveWalls3D from './InteractiveWalls3D';
import Floors3D from './Floors3D';
import Ceilings3D from './Ceilings3D';
import Stairs3D from './Stairs3D';
import ImportedHome3D from './ImportedHome3D';
import Props3D from './Props3D';
import WeatherEffects3D from './WeatherEffects3D';
import DeviceMarkers3D from '../devices/DeviceMarkers3D';
import { useAppStore } from '@/store/useAppStore';
import type { WallSegment, DeviceKind } from '@/store/types';

const generateId = () => Math.random().toString(36).slice(2, 10);

function SceneContent() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const wallDrawing = useAppStore((s) => s.build.wallDrawing);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const activeFloor = useAppStore((s) => s.layout.floors.find((f) => f.id === s.layout.activeFloorId));
  const gridState = useAppStore((s) => s.build.grid);
  const sunAzimuth = useAppStore((s) => s.environment.sunAzimuth);
  const sunElevation = useAppStore((s) => s.environment.sunElevation);
  const weatherCondition = useAppStore((s) => s.environment.weather.condition);

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

  const sunIntensity = sunElevation < 0 ? 0 : (weatherCondition === 'cloudy' ? 0.4 : weatherCondition === 'rain' ? 0.2 : weatherCondition === 'snow' ? 0.3 : 1.2);

  const setWallDrawing = useAppStore((s) => s.setWallDrawing);
  const addWall = useAppStore((s) => s.addWall);
  const setSelection = useAppStore((s) => s.setSelection);
  const pushUndo = useAppStore((s) => s.pushUndo);
  const addDevice = useAppStore((s) => s.addDevice);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const floors = useAppStore((s) => s.layout.floors);

  const [cursorPos, setCursorPos] = useState<[number, number] | null>(null);
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
        addDevice({
          id: generateId(),
          kind,
          name: '',
          floorId: activeFloorId,
          surface: kind === 'light' ? 'ceiling' : 'floor',
          position: [snapped[0], yPos, snapped[1]],
          rotation: [0, 0, 0],
        });
        setBuildTool('select');
        return;
      }
      if (activeTool === 'wall') {
        e.stopPropagation();
        const snapped = snapToGrid(point.x, point.z);
        if (!wallDrawing.isDrawing) {
          setWallDrawing({ isDrawing: true, nodes: [snapped] });
        } else {
          setWallDrawing({ nodes: [...wallDrawing.nodes, snapped] });
        }
      } else if (activeTool === 'select') {
        setSelection({ type: null, id: null });
      }
    },
    [activeTool, wallDrawing, snapToGrid, setWallDrawing, setSelection, activeFloorId, addDevice, setBuildTool, floors]
  );

  const handleGroundPointerMove = useCallback(
    (point: THREE.Vector3) => {
      if (activeTool === 'wall') {
        const snapped = snapToGrid(point.x, point.z);
        setCursorPos(snapped);
      }
    },
    [activeTool, snapToGrid]
  );

  const handleDoubleClick = useCallback(() => {
    if (activeTool === 'wall' && wallDrawing.isDrawing && activeFloorId) {
      pushUndo();
      const nodes = wallDrawing.nodes;
      for (let i = 0; i < nodes.length - 1; i++) {
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
      <ambientLight intensity={weatherCondition === 'cloudy' || weatherCondition === 'rain' ? 0.5 : 0.35} color="#b8c4d4" />
      <directionalLight position={sunPos} intensity={sunIntensity} color="#ffd699" castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-far={50} shadow-camera-left={-20} shadow-camera-right={20}
        shadow-camera-top={20} shadow-camera-bottom={-20} />
      <pointLight position={[0, 8, 0]} intensity={0.15} color="#4a9eff" />

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
      <WallDrawing3D cursorPos={cursorPos} />
      <WeatherEffects3D />
      <DeviceMarkers3D buildMode />

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

export default function BuildScene3D() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const wallDrawing = useAppStore((s) => s.build.wallDrawing);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const activeFloor = useAppStore((s) => s.layout.floors.find((f) => f.id === s.layout.activeFloorId));
  const setWallDrawing = useAppStore((s) => s.setWallDrawing);
  const addWall = useAppStore((s) => s.addWall);
  const pushUndo = useAppStore((s) => s.pushUndo);

  const handleDoubleClick = useCallback(() => {
    if (activeTool === 'wall' && wallDrawing.isDrawing && activeFloorId) {
      pushUndo();
      const nodes = wallDrawing.nodes;
      for (let i = 0; i < nodes.length - 1; i++) {
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

  return (
    <div className="w-full h-full" onDoubleClick={handleDoubleClick}>
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
    </div>
  );
}
