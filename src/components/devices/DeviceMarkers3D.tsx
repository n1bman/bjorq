import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import { useAppStore } from '@/store/useAppStore';
import type { DeviceKind, DeviceMarker } from '@/store/types';
import * as THREE from 'three';

// Extracted component that uses dragging-changed event instead of onObjectChange
// to prevent re-render loops that freeze the browser
function SelectedDeviceWithGizmo({
  marker,
  transformMode,
  updateDevice,
  handleSelect,
  Component,
}: {
  marker: DeviceMarker;
  transformMode: 'translate' | 'rotate';
  updateDevice: (id: string, changes: Partial<DeviceMarker>) => void;
  handleSelect: (id: string) => void;
  Component: React.FC<MarkerProps>;
}) {
  const tcRef = useRef<any>(null);

  useEffect(() => {
    const tc = tcRef.current;
    if (!tc) return;
    const handler = (event: { value: boolean }) => {
      if (!event.value && tc.object) {
        const obj = tc.object;
        updateDevice(marker.id, {
          position: [obj.position.x, obj.position.y, obj.position.z],
          rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
        });
      }
    };
    tc.addEventListener('dragging-changed', handler);
    return () => tc.removeEventListener('dragging-changed', handler);
  }, [marker.id, updateDevice]);

  return (
    <TransformControls
      ref={tcRef}
      mode={transformMode}
      size={0.6}
      position={marker.position}
    >
      <group>
        <Component
          position={[0, 0, 0]}
          id={marker.id}
          onSelect={handleSelect}
          selected
        />
      </group>
    </TransformControls>
  );
}

interface MarkerProps {
  position: [number, number, number];
  id: string;
  onSelect?: (id: string) => void;
  selected?: boolean;
}

function LightMarker({ position, id, onSelect, selected }: MarkerProps) {
  const [on, setOn] = useState(true);
  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    if (onSelect) { onSelect(id); } else { setOn(!on); }
  }, [onSelect, id, on]);
  return (
    <group position={position} onClick={handleClick}>
      <pointLight color="#ffd699" intensity={on ? 3 : 0} distance={8} decay={2} />
      <mesh>
        <sphereGeometry args={[selected ? 0.15 : 0.1, 16, 16]} />
        <meshStandardMaterial color="#f5c542" emissive="#f5c542" emissiveIntensity={on ? 1.5 : 0.1} transparent opacity={on ? 0.9 : 0.4} />
      </mesh>
      {selected && <SelectionRing radius={0.2} />}
    </group>
  );
}

function SwitchMarker({ position, id, onSelect, selected }: MarkerProps) {
  const [on, setOn] = useState(false);
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      const target = on ? 1.2 : 1;
      ref.current.scale.lerp(new THREE.Vector3(target, target, target), delta * 5);
    }
  });
  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    if (onSelect) { onSelect(id); } else { setOn(!on); }
  }, [onSelect, id, on]);
  return (
    <group position={position} onClick={handleClick}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.18, 32]} />
        <meshStandardMaterial color={on ? '#4a9eff' : '#666'} emissive={on ? '#4a9eff' : '#333'} emissiveIntensity={on ? 0.8 : 0.1} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      {selected && <SelectionRing radius={0.22} />}
    </group>
  );
}

function SensorMarker({ position, id, onSelect, selected }: MarkerProps) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.3;
      ref.current.scale.set(s, s, s);
    }
  });
  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    if (onSelect) onSelect(id);
  }, [onSelect, id]);
  return (
    <group position={position} onClick={handleClick}>
      <mesh ref={ref}>
        <sphereGeometry args={[selected ? 0.12 : 0.08, 16, 16]} />
        <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={0.8} transparent opacity={0.7} />
      </mesh>
      {selected && <SelectionRing radius={0.18} />}
    </group>
  );
}

function ClimateMarker({ position, id, onSelect, selected }: MarkerProps) {
  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    if (onSelect) onSelect(id);
  }, [onSelect, id]);
  return (
    <group position={position} onClick={handleClick}>
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.3} transparent opacity={selected ? 0.3 : 0.15} />
      </mesh>
      {selected && <SelectionRing radius={0.55} />}
    </group>
  );
}

function GenericMarker({ position, id, onSelect, selected, color, emissive }: MarkerProps & { color: string; emissive?: string }) {
  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    if (onSelect) onSelect(id);
  }, [onSelect, id]);
  return (
    <group position={position} onClick={handleClick}>
      <mesh>
        <sphereGeometry args={[selected ? 0.15 : 0.1, 16, 16]} />
        <meshStandardMaterial color={color} emissive={emissive ?? color} emissiveIntensity={0.6} transparent opacity={0.85} />
      </mesh>
      {selected && <SelectionRing radius={0.2} />}
    </group>
  );
}

function SelectionRing({ radius }: { radius: number }) {
  return (
    <mesh>
      <ringGeometry args={[radius, radius + 0.05, 32]} />
      <meshBasicMaterial color="#fff" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
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

// Store for transform mode so inspector can control it
let _transformMode: 'translate' | 'rotate' = 'translate';
let _setTransformMode: ((m: 'translate' | 'rotate') => void) | null = null;

export function getDeviceTransformMode() { return _transformMode; }
export function setDeviceTransformMode(m: 'translate' | 'rotate') {
  _transformMode = m;
  if (_setTransformMode) _setTransformMode(m);
}

export default function DeviceMarkers3D({ buildMode }: DeviceMarkers3DProps) {
  const markers = useAppStore((s) => s.devices.markers);
  const setSelection = useAppStore((s) => s.setSelection);
  const updateDevice = useAppStore((s) => s.updateDevice);
  const selectedId = useAppStore((s) => s.build.selection.id);
  const selectedType = useAppStore((s) => s.build.selection.type);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate'>('translate');

  useEffect(() => {
    _setTransformMode = setTransformMode;
    return () => { _setTransformMode = null; };
  }, []);

  const handleSelect = useCallback((id: string) => {
    if (buildMode) {
      setSelection({ type: 'device', id });
    }
  }, [buildMode, setSelection]);


  if (markers.length === 0) return null;

  return (
    <group>
      {markers.map((marker) => {
        const Component = markerComponents[marker.kind];
        const isSelected = buildMode && selectedId === marker.id && selectedType === 'device';

        if (isSelected && buildMode) {
          return (
            <SelectedDeviceWithGizmo
              key={marker.id + '-tc'}
              marker={marker}
              transformMode={transformMode}
              updateDevice={updateDevice}
              handleSelect={handleSelect}
              Component={Component}
            />
          );
        }

        return (
          <Component
            key={marker.id}
            position={marker.position}
            id={marker.id}
            onSelect={buildMode ? handleSelect : undefined}
            selected={false}
          />
        );
      })}
    </group>
  );
}
