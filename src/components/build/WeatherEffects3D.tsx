import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';

const MIN_RADIUS = 6; // meters from center — particles only spawn outside this
const MAX_HEIGHT = 6; // max spawn height in meters (stays below roof level)

function randomRingPosition(): [number, number, number] {
  let x: number, z: number;
  do {
    x = (Math.random() - 0.5) * 30;
    z = (Math.random() - 0.5) * 30;
  } while (Math.sqrt(x * x + z * z) < MIN_RADIUS);
  const y = Math.random() * MAX_HEIGHT;
  return [x, y, z];
}

export default function WeatherEffects3D() {
  const weather = useAppStore((s) => s.environment.weather.condition);
  const intensity = useAppStore((s) => s.environment.weather.intensity);
  const ref = useRef<THREE.Points>(null);

  const baseCount = weather === 'rain' ? 3000 : weather === 'snow' ? 1500 : 0;
  const effectiveIntensity = intensity > 0 ? intensity : (weather === 'rain' || weather === 'snow' ? 0.5 : 0);
  const count = Math.round(baseCount * effectiveIntensity);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const [x, y, z] = randomRingPosition();
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current || count === 0) return;
    const pos = ref.current.geometry.attributes.position;
    const speed = weather === 'rain' ? 15 : 2;
    for (let i = 0; i < count; i++) {
      let y = (pos as any).array[i * 3 + 1] - speed * delta;
      if (y < 0) {
        const [nx, , nz] = randomRingPosition();
        (pos as any).array[i * 3] = nx;
        (pos as any).array[i * 3 + 2] = nz;
        y = MAX_HEIGHT;
      }
      (pos as any).array[i * 3 + 1] = y;
      if (weather === 'snow') {
        (pos as any).array[i * 3] += Math.sin(Date.now() * 0.001 + i) * 0.01;
      }
    }
    pos.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={weather === 'rain' ? 0.05 : 0.08}
        color={weather === 'rain' ? '#aaddff' : '#ffffff'}
        transparent
        opacity={weather === 'rain' ? 0.6 : 0.8}
        sizeAttenuation
      />
    </points>
  );
}
