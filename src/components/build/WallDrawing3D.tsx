import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

interface WallDrawing3DProps {
  cursorPos: [number, number] | null;
}

export default function WallDrawing3D({ cursorPos }: WallDrawing3DProps) {
  const wallDrawing = useAppStore((s) => s.build.wallDrawing);

  const linePoints = useMemo(() => {
    if (!wallDrawing.isDrawing || wallDrawing.nodes.length === 0) return null;

    const pts: THREE.Vector3[] = wallDrawing.nodes.map(
      (n) => new THREE.Vector3(n[0], 0.05, n[1])
    );

    // Add cursor preview line
    if (cursorPos) {
      pts.push(new THREE.Vector3(cursorPos[0], 0.05, cursorPos[1]));
    }

    return pts;
  }, [wallDrawing, cursorPos]);

  if (!linePoints || linePoints.length < 2) {
    // Just show nodes if only one
    if (wallDrawing.isDrawing && wallDrawing.nodes.length === 1) {
      const n = wallDrawing.nodes[0];
      return (
        <mesh position={[n[0], 0.1, n[1]]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#e8a845" emissive="#e8a845" emissiveIntensity={0.5} />
        </mesh>
      );
    }
    return null;
  }

  return (
    <group>
      <Line
        points={linePoints}
        color="#e8a845"
        lineWidth={2}
        dashed
        dashSize={0.3}
        gapSize={0.15}
      />
      {/* Node spheres */}
      {wallDrawing.nodes.map((n, i) => (
        <mesh key={i} position={[n[0], 0.1, n[1]]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#e8a845" emissive="#e8a845" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {/* Cursor sphere */}
      {cursorPos && (
        <mesh position={[cursorPos[0], 0.1, cursorPos[1]]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}
