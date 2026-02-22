import { useAppStore } from '@/store/useAppStore';
import { Billboard, Text } from '@react-three/drei';
import type { DeviceKind } from '@/store/types';

const kindEmoji: Record<DeviceKind, string> = {
  light: '💡',
  switch: '🔌',
  sensor: '🌡️',
  climate: '❄️',
  vacuum: '🤖',
};

const kindColor: Record<DeviceKind, string> = {
  light: '#f5c542',
  switch: '#4a9eff',
  sensor: '#4ade80',
  climate: '#38bdf8',
  vacuum: '#a78bfa',
};

export default function DeviceMarkers3D() {
  const markers = useAppStore((s) => s.devices.markers);

  if (markers.length === 0) return null;

  return (
    <group>
      {markers.map((marker) => (
        <group key={marker.id} position={marker.position}>
          {/* Glow sphere */}
          <mesh>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial
              color={kindColor[marker.kind]}
              emissive={kindColor[marker.kind]}
              emissiveIntensity={0.8}
              transparent
              opacity={0.7}
            />
          </mesh>
          {/* Outer ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
            <ringGeometry args={[0.2, 0.25, 32]} />
            <meshBasicMaterial color={kindColor[marker.kind]} transparent opacity={0.3} side={2} />
          </mesh>
          {/* Label */}
          <Billboard position={[0, 0.5, 0]}>
            <Text fontSize={0.2} color={kindColor[marker.kind]} anchorX="center" anchorY="bottom">
              {kindEmoji[marker.kind]}
            </Text>
          </Billboard>
        </group>
      ))}
    </group>
  );
}
