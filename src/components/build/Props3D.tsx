import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
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

function isBlobOrDataUrl(url: string) {
  return url.startsWith('blob:') || url.startsWith('data:');
}

function analyzeModel(scene: THREE.Group) {
  let triangles = 0;
  let meshCount = 0;
  let materialCount = 0;
  const materials = new Set<string>();

  scene.traverse((child: any) => {
    if (child.isMesh) {
      meshCount++;
      const geo = child.geometry;
      if (geo) {
        triangles += geo.index ? geo.index.count / 3 : (geo.attributes.position?.count ?? 0) / 3;
      }
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m: any) => materials.add(m.uuid));
    }
  });
  materialCount = materials.size;

  let rating: 'OK' | 'Tung' | 'För tung' = 'OK';
  if (triangles > 500_000 || materialCount > 50) rating = 'För tung';
  else if (triangles > 100_000 || materialCount > 20) rating = 'Tung';

  return { triangles: Math.round(triangles), meshCount, materialCount, rating };
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
  const catalog = useAppStore((s) => s.props.catalog);

  const isSelected = selection.type === 'prop' && selection.id === id;
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const { camera, raycaster, gl } = useThree();

  // Robust loader state machine
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [modelInfo, setModelInfo] = useState<ReturnType<typeof analyzeModel> | null>(null);
  const retryCount = useRef(0);
  const currentUrl = useRef('');

  // Find catalog item for name
  const items = useAppStore((s) => s.props.items);
  const propItem = items.find((p) => p.id === id);
  const catItem = propItem ? catalog.find((c) => c.id === propItem.catalogId) : null;
  const modelName = catItem?.name || 'Modell';

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
        console.warn(`[Props3D] Timeout loading ${modelName}`);
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
        const info = analyzeModel(gltf.scene);
        setModelInfo(info);
        console.info(`[Props3D] Loaded "${modelName}": ${info.triangles.toLocaleString()} trianglar, ${info.meshCount} meshes, ${info.materialCount} material — ${info.rating}`);
        setScene(gltf.scene);
        setStatus('ready');
      },
      undefined,
      (err) => {
        clearTimeout(timeout);
        console.warn(`[Props3D] Error loading "${modelName}":`, err);
        handleLoadError(loadUrl);
      }
    );
  }, [url, modelName]);

  const handleLoadError = useCallback((failedUrl: string) => {
    if (retryCount.current < 1 && !isBlobOrDataUrl(url)) {
      retryCount.current++;
      const bustUrl = url + (url.includes('?') ? '&' : '?') + `v=${Date.now()}`;
      console.info(`[Props3D] Retrying "${modelName}" with cache bust`);
      loadModel(bustUrl);
    } else {
      setStatus('error');
    }
  }, [url, loadModel, modelName]);

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
      <group position={position}>
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#e8a838" wireframe />
        </mesh>
        <Html center style={{ pointerEvents: 'none' }}>
          <div style={{ background: 'hsl(220 18% 13% / 0.9)', color: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: 10, whiteSpace: 'nowrap', textAlign: 'center' }}>
            <div>Laddar...</div>
            <div style={{ opacity: 0.6 }}>{modelName}</div>
          </div>
        </Html>
      </group>
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
          <div style={{ background: 'hsl(220 18% 13% / 0.95)', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
            <div style={{ color: '#ef4444', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>
              Kunde inte ladda: {modelName}
            </div>
            <button
              onClick={() => { retryCount.current = 0; loadModel(url); }}
              style={{
                background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6,
                padding: '4px 10px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Ladda om
            </button>
          </div>
        </Html>
      </group>
    );
  }

  if (!scene) return null;

  const clonedScene = scene.clone();
  clonedScene.traverse((child: any) => {
    if (child.isMesh) {
      child.castShadow = false;
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
        <>
          <mesh position={[position[0], 0.02, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.4 * scale[0], 0.5 * scale[0], 32]} />
            <meshBasicMaterial color="#4a9eff" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
          {modelInfo && (
            <Html position={[position[0], position[1] + 1.2, position[2]]} center style={{ pointerEvents: 'none' }}>
              <div style={{
                background: 'hsl(220 18% 13% / 0.92)',
                border: '1px solid hsl(220 14% 24%)',
                borderRadius: 8,
                padding: '5px 10px',
                fontSize: 10,
                color: '#e2e8f0',
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{modelName}</div>
                <div style={{ opacity: 0.7 }}>
                  {modelInfo.triangles.toLocaleString('sv-SE')} △ · {modelInfo.meshCount} mesh · {modelInfo.materialCount} mat
                </div>
                <div style={{
                  marginTop: 2,
                  fontWeight: 600,
                  color: modelInfo.rating === 'OK' ? '#4ade80' : modelInfo.rating === 'Tung' ? '#fbbf24' : '#ef4444',
                }}>
                  {modelInfo.rating === 'OK' ? '✓ OK' : modelInfo.rating === 'Tung' ? '⚠ Tung' : '⛔ För tung'}
                </div>
              </div>
            </Html>
          )}
        </>
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
