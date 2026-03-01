import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { ErrorBoundary } from './ErrorBoundary3D';
import { useThree } from '@react-three/fiber';
import { useAppStore } from '../../store/useAppStore';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { PropModelStats } from '../../store/types';

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

function analyzeModel(scene: THREE.Group): PropModelStats {
  let triangles = 0;
  let meshCount = 0;
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

  let rating: string = 'OK';
  if (triangles > 500_000 || materials.size > 50) rating = 'För tung';
  else if (triangles > 100_000 || materials.size > 20) rating = 'Tung';

  return { triangles: Math.round(triangles), meshCount, materialCount: materials.size, rating };
}

/** Load a GLB/GLTF via XHR for blob:/data: URLs (bypasses CDN proxy) */
function loadGltf(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    if (isBlobOrDataUrl(url)) {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = () => {
        if (xhr.status === 0 || xhr.status === 200) {
          try {
            loader.parse(xhr.response, '', (gltf) => resolve(gltf.scene), (err) => reject(err));
          } catch (e) { reject(e); }
        } else {
          reject(new Error(`XHR status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('XHR network error'));
      xhr.send();
    } else {
      loader.load(url, (gltf) => resolve(gltf.scene), undefined, (err) => reject(err));
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
  const catalog = useAppStore((s) => s.props.catalog);

  const isSelected = selection.type === 'prop' && selection.id === id;
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const { camera, raycaster, gl } = useThree();

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const retryCount = useRef(0);
  const currentUrl = useRef('');

  // Find catalog item for name
  const items = useAppStore((s) => s.props.items);
  const propItem = items.find((p) => p.id === id);
  const catItem = propItem ? catalog.find((c) => c.id === propItem.catalogId) : null;
  const modelName = propItem?.name || catItem?.name || 'Modell';
  const modelStats = propItem?.modelStats ?? null;

  useEffect(() => {
    if (!url) { setStatus('idle'); return; }
    if (scene) { disposeScene(scene); setScene(null); }
    currentUrl.current = url;
    retryCount.current = 0;
    doLoad(url);
    return () => { currentUrl.current = ''; };
  }, [url]);

  const doLoad = useCallback((loadUrl: string) => {
    setStatus('loading');
    const timeout = setTimeout(() => {
      if (currentUrl.current === url) {
        console.warn(`[Props3D] Timeout loading ${modelName}`);
        handleLoadError(loadUrl);
      }
    }, LOAD_TIMEOUT);

    loadGltf(loadUrl)
      .then((loadedScene) => {
        clearTimeout(timeout);
        if (currentUrl.current !== url) { disposeScene(loadedScene); return; }
        const info = analyzeModel(loadedScene);
        console.info(`[Props3D] Loaded "${modelName}": ${info.triangles.toLocaleString()} △ · ${info.meshCount} mesh · ${info.materialCount} mat — ${info.rating}`);
        // Persist stats to store
        updateProp(id, { modelStats: info });
        setScene(loadedScene);
        setStatus('ready');
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.warn(`[Props3D] Error loading "${modelName}":`, err);
        handleLoadError(loadUrl);
      });
  }, [url, modelName, id, updateProp]);

  const handleLoadError = useCallback((failedUrl: string) => {
    if (retryCount.current < 1 && !isBlobOrDataUrl(url)) {
      retryCount.current++;
      const bustUrl = url + (url.includes('?') ? '&' : '?') + `v=${Date.now()}`;
      console.info(`[Props3D] Retrying "${modelName}" with cache bust`);
      doLoad(bustUrl);
    } else {
      setStatus('error');
    }
  }, [url, doLoad, modelName]);

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
              onClick={() => { retryCount.current = 0; doLoad(url); }}
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
