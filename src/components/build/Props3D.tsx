import { useRef, useState, useEffect, useMemo } from 'react';
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

/** Parse base64 fileData directly into a THREE.Group — no network needed */
function loadFromBase64(base64: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      loader.parse(bytes.buffer, '', (gltf) => resolve(gltf.scene), (err) => reject(err));
    } catch (e) { reject(e); }
  });
}

/** Load a GLB/GLTF via network (non-blob URLs only) */
function loadGltfFromUrl(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, (err) => reject(err));
  });
}

/** Look up base64 fileData from the catalog for a given prop id */
function getFileDataForProp(propId: string): string | null {
  const state = useAppStore.getState();
  const propItem = state.props.items.find((p) => p.id === propId);
  if (!propItem) return null;
  const catItem = state.props.catalog.find((c: any) => c.id === propItem.catalogId);
  return (catItem as any)?.fileData ?? null;
}

function PropModel({ id, url: rawUrl, position, rotation, scale, colorOverride, textureOverride, textureScale = 1, metalness: metalnessOverride, roughness: roughnessOverride }: {
  id: string;
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  colorOverride?: string;
  textureOverride?: string;
  textureScale?: number;
  metalness?: number;
  roughness?: number;
}) {
  const url = rawUrl;
  const appMode = useAppStore((s) => s.appMode);
  const selection = useAppStore((s) => s.build.selection);
  const setSelection = useAppStore((s) => s.setSelection);
  const activeTool = useAppStore((s) => s.build.activeTool);
  const tab = useAppStore((s) => s.build.tab);

  const isSelected = appMode === 'build' && selection.type === 'prop' && selection.id === id;
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const { camera, raycaster, gl } = useThree();

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const loadingRef = useRef(false);
  const lastLoadedUrl = useRef('');
  const retryCount = useRef(0);

  // Find model name for logging
  const items = useAppStore((s) => s.props.items);
  const propItem = items.find((p) => p.id === id);
  const modelName = propItem?.name || 'Modell';

  // Plain function — no useCallback to avoid circular deps
  const doLoad = (propId: string, loadUrl: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setStatus('loading');

    const timeout = setTimeout(() => {
      if (loadingRef.current) {
        console.warn(`[Props3D] Timeout loading ${modelName}`);
        loadingRef.current = false;
        setStatus('error');
      }
    }, LOAD_TIMEOUT);

    const handleSuccess = (loadedScene: THREE.Group) => {
      clearTimeout(timeout);
      loadingRef.current = false;
      const info = analyzeModel(loadedScene);
      console.info(`[Props3D] Loaded "${modelName}": ${info.triangles.toLocaleString()} △ · ${info.meshCount} mesh · ${info.materialCount} mat — ${info.rating}`);
      useAppStore.getState().updateProp(propId, { modelStats: info });
      setScene(loadedScene);
      setStatus('ready');
    };

    const handleError = () => {
      clearTimeout(timeout);
      loadingRef.current = false;
      setStatus('error');
    };

    // Strategy 1: Try loading from catalog fileData (base64) — works everywhere
    const fileData = getFileDataForProp(propId);
    if (fileData) {
      console.info(`[Props3D] Loading "${modelName}" from fileData (base64)`);
      loadFromBase64(fileData).then(handleSuccess).catch((err: unknown) => {
        console.warn(`[Props3D] fileData parse failed for "${modelName}":`, err);
        handleError();
      });
      return;
    }

    // Strategy 2: Non-blob URL — load via network
    if (!isBlobOrDataUrl(loadUrl)) {
      loadGltfFromUrl(loadUrl).then(handleSuccess).catch((err: unknown) => {
        console.warn(`[Props3D] Network load failed for "${modelName}":`, err);
        if (retryCount.current < 1) {
          retryCount.current++;
          loadingRef.current = false;
          const bustUrl = loadUrl + (loadUrl.includes('?') ? '&' : '?') + `v=${Date.now()}`;
          console.info(`[Props3D] Retrying "${modelName}" with cache bust`);
          doLoad(propId, bustUrl);
        } else {
          handleError();
        }
      });
      return;
    }

    // Strategy 3: blob/data URL with no fileData — unlikely to work in sandbox but try
    console.warn(`[Props3D] No fileData for "${modelName}", blob URL may fail`);
    handleError();
  };

  // Load effect — only runs when url actually changes
  useEffect(() => {
    if (!url) { setStatus('idle'); return; }

    // Don't reload if same URL
    const baseUrl = url.split('?')[0];
    if (baseUrl === lastLoadedUrl.current) return;

    // Dispose old scene
    if (scene) { disposeScene(scene); setScene(null); }

    lastLoadedUrl.current = baseUrl;
    retryCount.current = 0;
    loadingRef.current = false; // Reset guard
    doLoad(id, url);

    return () => {
      lastLoadedUrl.current = '';
    };
  }, [url]);

  const handleClick = (e: ThreeEvent<PointerEvent>) => {
    if (appMode !== 'build' || activeTool !== 'select') return;
    e.stopPropagation();
    setSelection({ type: 'prop', id });
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (appMode !== 'build' || activeTool !== 'select' || tab !== 'furnish') return;
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
        useAppStore.getState().updateProp(id, {
          position: [
            target.x - dragOffset.current.x,
            Math.max(0, position[1]),
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
  };

  // Memoize scene clone — only re-clone when scene or selection changes
  const displayScene = useMemo(() => {
    if (!scene) return null;
    const clone = scene.clone();
    clone.traverse((child: any) => {
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
    return clone;
  }, [scene, isSelected]);

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
              onClick={() => { retryCount.current = 0; loadingRef.current = false; lastLoadedUrl.current = ''; doLoad(id, url); }}
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

  if (!displayScene) return null;

  return (
    <group ref={groupRef}>
      <primitive
        object={displayScene}
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
