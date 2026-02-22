import { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAppStore } from '@/store/useAppStore';
import type { DeviceKind } from '@/store/types';
import * as THREE from 'three';

const kindColor: Record<DeviceKind, string> = {
  light: '#f5c542',
  switch: '#4a9eff',
  sensor: '#4ade80',
  climate: '#38bdf8',
  vacuum: '#a78bfa',
};

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
        <meshStandardMaterial
          color="#f5c542"
          emissive="#f5c542"
          emissiveIntensity={on ? 1.5 : 0.1}
          transparent
          opacity={on ? 0.9 : 0.4}
        />
      </mesh>
      {selected && (
        <mesh>
          <ringGeometry args={[0.2, 0.25, 32]} />
          <meshBasicMaterial color="#fff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
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
        <meshStandardMaterial
          color={on ? '#4a9eff' : '#666'}
          emissive={on ? '#4a9eff' : '#333'}
          emissiveIntensity={on ? 0.8 : 0.1}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      {selected && (
        <mesh>
          <ringGeometry args={[0.22, 0.27, 32]} />
          <meshBasicMaterial color="#fff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
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
        <meshStandardMaterial
          color="#4ade80"
          emissive="#4ade80"
          emissiveIntensity={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>
      {selected && (
        <mesh>
          <ringGeometry args={[0.18, 0.22, 32]} />
          <meshBasicMaterial color="#fff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
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
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={0.3}
          transparent
          opacity={selected ? 0.3 : 0.15}
        />
      </mesh>
      {selected && (
        <mesh>
          <ringGeometry args={[0.55, 0.6, 32]} />
          <meshBasicMaterial color="#fff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

const markerComponents: Record<DeviceKind, React.FC<MarkerProps>> = {
  light: LightMarker,
  switch: SwitchMarker,
  sensor: SensorMarker,
  climate: ClimateMarker,
  vacuum: SensorMarker,
};

interface DeviceMarkers3DProps {
  buildMode?: boolean;
}

export default function DeviceMarkers3D({ buildMode }: DeviceMarkers3DProps) {
  const markers = useAppStore((s) => s.devices.markers);
  const setSelection = useAppStore((s) => s.setSelection);
  const selectedId = useAppStore((s) => s.build.selection.id);

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
        return (
          <Component
            key={marker.id}
            position={marker.position}
            id={marker.id}
            onSelect={buildMode ? handleSelect : undefined}
            selected={buildMode && selectedId === marker.id}
          />
        );
      })}
    </group>
  );
}
