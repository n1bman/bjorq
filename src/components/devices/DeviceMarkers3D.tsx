import { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useAppStore } from '@/store/useAppStore';
import type { DeviceKind, DeviceMarker } from '@/store/types';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';

interface MarkerProps {
  position: [number, number, number];
  id: string;
  onSelect?: (id: string) => void;
  onDragStart?: (id: string, e: ThreeEvent<PointerEvent>) => void;
  selected?: boolean;
}

function SelectionRing({ radius }: { radius: number }) {
  return (
    <mesh>
      <ringGeometry args={[radius, radius + 0.05, 32]} />
      <meshBasicMaterial color="#fff" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

function LightMarker({ position, id, onSelect, onDragStart, selected }: MarkerProps) {
  const [on, setOn] = useState(true);
  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onSelect) { onSelect(id); } else { setOn(!on); }
  }, [onSelect, id, on]);
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (selected && onDragStart) { onDragStart(id, e); }
  }, [selected, onDragStart, id]);
  return (
    <group position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
      <pointLight color="#ffd699" intensity={on ? 3 : 0} distance={8} decay={2} />
      <mesh>
        <sphereGeometry args={[selected ? 0.15 : 0.1, 16, 16]} />
        <meshStandardMaterial color="#f5c542" emissive="#f5c542" emissiveIntensity={on ? 1.5 : 0.1} transparent opacity={on ? 0.9 : 0.4} />
      </mesh>
      {selected && <SelectionRing radius={0.2} />}
    </group>
  );
}

function SwitchMarker({ position, id, onSelect, onDragStart, selected }: MarkerProps) {
  const [on, setOn] = useState(false);
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      const target = on ? 1.2 : 1;
      ref.current.scale.lerp(new THREE.Vector3(target, target, target), delta * 5);
    }
  });
  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onSelect) { onSelect(id); } else { setOn(!on); }
  }, [onSelect, id, on]);
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (selected && onDragStart) { onDragStart(id, e); }
  }, [selected, onDragStart, id]);
  return (
    <group position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.18, 32]} />
        <meshStandardMaterial color={on ? '#4a9eff' : '#666'} emissive={on ? '#4a9eff' : '#333'} emissiveIntensity={on ? 0.8 : 0.1} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      {selected && <SelectionRing radius={0.22} />}
    </group>
  );
}

function SensorMarker({ position, id, onSelect, onDragStart, selected }: MarkerProps) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.3;
      ref.current.scale.set(s, s, s);
    }
  });
  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onSelect) onSelect(id);
  }, [onSelect, id]);
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (selected && onDragStart) { onDragStart(id, e); }
  }, [selected, onDragStart, id]);
  return (
    <group position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
      <mesh ref={ref}>
        <sphereGeometry args={[selected ? 0.12 : 0.08, 16, 16]} />
        <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={0.8} transparent opacity={0.7} />
      </mesh>
      {selected && <SelectionRing radius={0.18} />}
    </group>
  );
}

function ClimateMarker({ position, id, onSelect, onDragStart, selected }: MarkerProps) {
  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onSelect) onSelect(id);
  }, [onSelect, id]);
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (selected && onDragStart) { onDragStart(id, e); }
  }, [selected, onDragStart, id]);
  return (
    <group position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.3} transparent opacity={selected ? 0.3 : 0.15} />
      </mesh>
      {selected && <SelectionRing radius={0.55} />}
    </group>
  );
}

function GenericMarker({ position, id, onSelect, onDragStart, selected, color, emissive }: MarkerProps & { color: string; emissive?: string }) {
  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onSelect) onSelect(id);
  }, [onSelect, id]);
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (selected && onDragStart) { onDragStart(id, e); }
  }, [selected, onDragStart, id]);
  return (
    <group position={position} onClick={handleClick} onPointerDown={handlePointerDown}>
      <mesh>
        <sphereGeometry args={[selected ? 0.15 : 0.1, 16, 16]} />
        <meshStandardMaterial color={color} emissive={emissive ?? color} emissiveIntensity={0.6} transparent opacity={0.85} />
      </mesh>
      {selected && <SelectionRing radius={0.2} />}
    </group>
  );
}

const markerComponents: Record<DeviceKind, React.FC<MarkerProps>> = {
  light: LightMarker,
  switch: SwitchMarker,
  sensor: SensorMarker,
  climate: ClimateMarker,
  vacuum: (props) => <GenericMarker {...props} color="#a78bfa" />,
  camera: (props) => <GenericMarker {...props} color="#ef4444" />,
  fridge: (props) => <GenericMarker {...props} color="#cbd5e1" emissive="#94a3b8" />,
  oven: (props) => <GenericMarker {...props} color="#f97316" />,
  washer: (props) => <GenericMarker {...props} color="#7dd3fc" emissive="#38bdf8" />,
  'garage-door': (props) => <GenericMarker {...props} color="#f59e0b" />,
  'door-lock': (props) => <GenericMarker {...props} color="#fbbf24" />,
  'power-outlet': (props) => <GenericMarker {...props} color="#fde047" emissive="#eab308" />,
};

interface DeviceMarkers3DProps {
  buildMode?: boolean;
}

export default function DeviceMarkers3D({ buildMode }: DeviceMarkers3DProps) {
  const markers = useAppStore((s) => s.devices.markers);
  const setSelection = useAppStore((s) => s.setSelection);
  const updateDevice = useAppStore((s) => s.updateDevice);
  const selectedId = useAppStore((s) => s.build.selection.id);
  const selectedType = useAppStore((s) => s.build.selection.type);
  const { camera, raycaster, gl } = useThree();

  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const dragDeviceId = useRef<string | null>(null);
  const dragDeviceY = useRef(0);

  const handleSelect = useCallback((id: string) => {
    if (buildMode) {
      setSelection({ type: 'device', id });
    }
  }, [buildMode, setSelection]);

  const handleDragStart = useCallback((id: string, e: ThreeEvent<PointerEvent>) => {
    if (!buildMode) return;
    e.stopPropagation();

    const marker = markers.find((m) => m.id === id);
    if (!marker) return;

    dragDeviceId.current = id;
    dragDeviceY.current = marker.position[1];
    dragPlane.current.set(new THREE.Vector3(0, 1, 0), -marker.position[1]);
    dragOffset.current.set(
      e.point.x - marker.position[0],
      0,
      e.point.z - marker.position[2]
    );
    gl.domElement.style.cursor = 'grabbing';

    const onPointerMove = (moveEvent: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((moveEvent.clientX - rect.left) / rect.width) * 2 - 1,
        -((moveEvent.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane.current, target);
      if (target && dragDeviceId.current) {
        updateDevice(dragDeviceId.current, {
          position: [
            target.x - dragOffset.current.x,
            dragDeviceY.current,
            target.z - dragOffset.current.z,
          ],
        });
      }
    };

    const onPointerUp = () => {
      dragDeviceId.current = null;
      gl.domElement.style.cursor = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [buildMode, markers, camera, raycaster, gl, updateDevice]);

  if (markers.length === 0) return null;

  return (
    <group>
      {markers.map((marker) => {
        const Component = markerComponents[marker.kind];
        const isSelected = buildMode && selectedId === marker.id && selectedType === 'device';

        return (
          <Component
            key={marker.id}
            position={marker.position}
            id={marker.id}
            onSelect={buildMode ? handleSelect : undefined}
            onDragStart={buildMode ? handleDragStart : undefined}
            selected={!!isSelected}
          />
        );
      })}
    </group>
  );
}
