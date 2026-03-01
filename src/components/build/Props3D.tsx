import { Suspense, useRef, useState, useCallback } from 'react';
import { ErrorBoundary } from './ErrorBoundary3D';
import { useLoader, useThree } from '@react-three/fiber';
import { useAppStore } from '../../store/useAppStore';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';

function PropModel({ id, url, position, rotation, scale }: {
  id: string;
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}) {
  const gltf = useLoader(GLTFLoader, url);
  const selection = useAppStore((s) => s.build.selection);
  const setSelection = useAppStore((s) => s.setSelection);
  const updateProp = useAppStore((s) => s.updateProp);
  const activeTool = useAppStore((s) => s.build.activeTool);
  const tab = useAppStore((s) => s.build.tab);

  const isSelected = selection.type === 'prop' && selection.id === id;
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const { camera, raycaster, gl } = useThree();

  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    setSelection({ type: 'prop', id });
  }, [activeTool, id, setSelection]);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (activeTool !== 'select' || tab !== 'furnish') return;
    e.stopPropagation();
    setSelection({ type: 'prop', id });

    // Start drag
    const intersectPoint = e.point;
    dragPlane.current.set(new THREE.Vector3(0, 1, 0), -position[1]);
    dragOffset.current.set(
      intersectPoint.x - position[0],
      0,
      intersectPoint.z - position[2]
    );
    setIsDragging(true);
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
      if (target) {
        updateProp(id, {
          position: [
            target.x - dragOffset.current.x,
            position[1],
            target.z - dragOffset.current.z,
          ],
        });
      }
    };

    const onPointerUp = () => {
      setIsDragging(false);
      gl.domElement.style.cursor = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [activeTool, tab, id, position, camera, raycaster, gl, updateProp, setSelection]);

  const scene = gltf.scene.clone();

  // Enable shadows + highlight on all meshes
  scene.traverse((child: any) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (isSelected) {
        child.material = child.material.clone();
        child.material.emissive = new THREE.Color('#4a9eff');
        child.material.emissiveIntensity = 0.3;
      }
    }
  });

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        position={position}
        rotation={rotation}
        scale={scale}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      />
      {/* Selection indicator ring on floor */}
      {isSelected && (
        <mesh position={[position[0], 0.02, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4 * scale[0], 0.5 * scale[0], 32]} />
          <meshBasicMaterial color="#4a9eff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

export default function Props3D() {
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const items = useAppStore((s) => s.props.items);

  const floorItems = items.filter((p) => p.floorId === activeFloorId);

  if (floorItems.length === 0) return null;

  return (
    <group>
      {floorItems.map((prop) => (
        <ErrorBoundary key={prop.id} fallback={
          <mesh position={prop.position}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#e8a838" wireframe />
          </mesh>
        }>
          <Suspense fallback={
            <mesh position={prop.position}>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshStandardMaterial color="#e8a838" wireframe />
            </mesh>
          }>
            <PropModel
              id={prop.id}
              url={prop.url}
              position={prop.position}
              rotation={prop.rotation}
              scale={prop.scale}
            />
          </Suspense>
        </ErrorBoundary>
      ))}
    </group>
  );
}
