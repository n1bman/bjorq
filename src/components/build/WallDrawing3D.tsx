import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import * as THREE from 'three';
import { Line, Html } from '@react-three/drei';

interface WallDrawing3DProps {
  cursorPos: [number, number] | null;
  cursorSnapped?: boolean;
  cursorMidSnap?: boolean;
  /** True when cursor is axis-aligned (0/90/180/270°) with last node */
  cursorAxisAligned?: boolean;
}

export default function WallDrawing3D({ cursorPos, cursorSnapped, cursorMidSnap, cursorAxisAligned }: WallDrawing3DProps) {
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

  // When axis-aligned: solid cyan line. Otherwise: dashed amber.
  const lineColor = cursorAxisAligned ? '#38bdf8' : '#e8a845';

  return (
    <group>
      <Line
        points={linePoints}
        color={lineColor}
        lineWidth={cursorAxisAligned ? 3 : 2}
        dashed={!cursorAxisAligned}
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
        <group>
          <mesh position={[cursorPos[0], 0.1, cursorPos[1]]}>
            <sphereGeometry args={[cursorSnapped ? 0.12 : cursorAxisAligned ? 0.09 : 0.06, 16, 16]} />
            <meshStandardMaterial
              color={cursorAxisAligned ? '#38bdf8' : cursorSnapped ? (cursorMidSnap ? '#facc15' : '#4ade80') : '#ffffff'}
              emissive={cursorAxisAligned ? '#38bdf8' : cursorSnapped ? (cursorMidSnap ? '#facc15' : '#4ade80') : '#ffffff'}
              emissiveIntensity={cursorAxisAligned ? 1.0 : cursorSnapped ? 0.8 : 0.3}
              transparent
              opacity={cursorAxisAligned ? 0.95 : cursorSnapped ? 0.9 : 0.6}
            />
          </mesh>
          {/* 90° label */}
          {cursorAxisAligned && (
            <Html position={[cursorPos[0], 0.4, cursorPos[1]]} center>
              <div style={{
                background: 'rgba(56, 189, 248, 0.9)',
                color: '#fff',
                padding: '1px 6px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}>
                90°
              </div>
            </Html>
          )}
        </group>
      )}
    </group>
  );
}
