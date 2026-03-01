import { useRef, useState, useCallback, useEffect } from 'react';
import { ErrorBoundary } from './ErrorBoundary3D';
import { useThree } from '@react-three/fiber';
import { useAppStore } from '../../store/useAppStore';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';

const LOAD_TIMEOUT = 30_000;
const loader = new GLTFLoader();

function disposeScene(scene: THREE.Group) {
  scene.traverse((child: any) => {
    if (child.isMesh) {
      child.geometry?.dispose();
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat: any) => {
          Object.values(mat).forEach((v: any) => {
            if (v instanceof THREE.Texture) v.dispose();
          });
          mat.dispose();
        });
      }
    }
  });
}

function PropModel({ id, url, position, rotation, scale }: {
  id: string;
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}) {
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

  // Robust loader state machine
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const retryCount = useRef(0);
  const currentUrl = useRef('');

  useEffect(() => {
    if (!url) { setStatus('idle'); return; }

    // Dispose old scene
    if (scene) { disposeScene(scene); setScene(null); }

    currentUrl.current = url;
    retryCount.current = 0;
    loadModel(url);

    return () => {
      currentUrl.current = '';
    };
  }, [url]);

  const loadModel = useCallback((loadUrl: string) => {
    setStatus('loading');
    const timeout = setTimeout(() => {
      if (currentUrl.current === url) {
        console.warn(`[Props3D] Timeout loading ${loadUrl}`);
        handleLoadError(loadUrl);
      }
    }, LOAD_TIMEOUT);

    loader.load(
      loadUrl,
      (gltf) => {
        clearTimeout(timeout);
        if (currentUrl.current !== url) {
          disposeScene(gltf.scene);
          return;
        }
        setScene(gltf.scene);
        setStatus('ready');
      },
      undefined,
      (err) => {
        clearTimeout(timeout);
        console.warn(`[Props3D] Error loading ${loadUrl}:`, err);
        handleLoadError(loadUrl);
      }
    );
  }, [url]);

  const handleLoadError = useCallback((failedUrl: string) => {
    if (retryCount.current < 1) {
      retryCount.current++;
      const bustUrl = url + (url.includes('?') ? '&' : '?') + `v=${Date.now()}`;
      console.info(`[Props3D] Retrying with cache bust: ${bustUrl}`);
      loadModel(bustUrl);
    } else {
      setStatus('error');
    }
  }, [url, loadModel]);

  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    setSelection({ type: 'prop', id });
  }, [activeTool, id, setSelection]);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (activeTool !== 'select' || tab !== 'furnish') return;
    e.stopPropagation();
    setSelection({ type: 'prop', id });

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

  // Loading state
  if (status === 'loading' || status === 'idle') {
    return (
      <mesh position={position}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#e8a838" wireframe />
      </mesh>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <group position={position}>
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#ef4444" wireframe />
        </mesh>
        <Html center style={{ pointerEvents: 'auto' }}>
          <button
            onClick={() => { retryCount.current = 0; loadModel(url); }}
            style={{
              background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6,
              padding: '4px 10px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Ladda om
          </button>
        </Html>
      </group>
    );
  }

  if (!scene) return null;

  const clonedScene = scene.clone();
  clonedScene.traverse((child: any) => {
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
        object={clonedScene}
        position={position}
        rotation={rotation}
        scale={scale}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      />
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
          <PropModel
            id={prop.id}
            url={prop.url}
            position={prop.position}
            rotation={prop.rotation}
            scale={prop.scale}
          />
        </ErrorBoundary>
      ))}
    </group>
  );
}
