import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';

export default function WeatherEffects3D() {
  const weather = useAppStore((s) => s.environment.weather.condition);
  const ref = useRef<THREE.Points>(null);

  const count = weather === 'rain' ? 3000 : weather === 'snow' ? 1500 : 0;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 1] = Math.random() * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current || count === 0) return;
    const pos = ref.current.geometry.attributes.position;
    const speed = weather === 'rain' ? 15 : 2;
    for (let i = 0; i < count; i++) {
      const y = (pos as any).array[i * 3 + 1] - speed * delta;
      (pos as any).array[i * 3 + 1] = y < 0 ? 20 : y;
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
