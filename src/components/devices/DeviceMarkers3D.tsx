import { useRef, useState } from 'react';
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

function LightMarker({ position, id }: { position: [number, number, number]; id: string }) {
  const [on, setOn] = useState(true);
  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); setOn(!on); }}>
      <pointLight color="#ffd699" intensity={on ? 3 : 0} distance={8} decay={2} />
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color="#f5c542"
          emissive="#f5c542"
          emissiveIntensity={on ? 1.5 : 0.1}
          transparent
          opacity={on ? 0.9 : 0.4}
        />
      </mesh>
    </group>
  );
}

function SwitchMarker({ position, id }: { position: [number, number, number]; id: string }) {
  const [on, setOn] = useState(false);
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      const target = on ? 1.2 : 1;
      ref.current.scale.lerp(new THREE.Vector3(target, target, target), delta * 5);
    }
  });
  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); setOn(!on); }}>
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
    </group>
  );
}

function SensorMarker({ position, id }: { position: [number, number, number]; id: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.3;
      ref.current.scale.set(s, s, s);
    }
  });
  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color="#4ade80"
          emissive="#4ade80"
          emissiveIntensity={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}

function ClimateMarker({ position, id }: { position: [number, number, number]; id: string }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={0.3}
          transparent
          opacity={0.15}
        />
      </mesh>
    </group>
  );
}

const markerComponents: Record<DeviceKind, React.FC<{ position: [number, number, number]; id: string }>> = {
  light: LightMarker,
  switch: SwitchMarker,
  sensor: SensorMarker,
  climate: ClimateMarker,
  vacuum: SensorMarker, // reuse sensor style for vacuum
};

export default function DeviceMarkers3D() {
  const markers = useAppStore((s) => s.devices.markers);
  if (markers.length === 0) return null;

  return (
    <group>
      {markers.map((marker) => {
        const Component = markerComponents[marker.kind];
        return <Component key={marker.id} position={marker.position} id={marker.id} />;
      })}
    </group>
  );
}
