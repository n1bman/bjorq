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
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_THRESHOLD = 5;

// Module-level map of loaded scenes for placement engine
export const sceneRefs = new Map<string, THREE.Group>();

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

function loadGltfFromUrl(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, (err) => reject(err));
  });
}

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

  const isSelected = appMode === 'build' && selection.type === 'prop' && selection.id === id;
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragShadowPos, setDragShadowPos] = useState<[number, number, number] | null>(null);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggered = useRef(false);
  const { camera, raycaster, gl } = useThree();

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const loadingRef = useRef(false);
  const lastLoadedUrl = useRef('');
  const retryCount = useRef(0);

  const items = useAppStore((s) => s.props.items);
  const propItem = items.find((p) => p.id === id);
  const modelName = propItem?.name || 'Modell';

  // Dismiss quick menu on deselect or escape
  useEffect(() => {
    if (!isSelected) setShowQuickMenu(false);
  }, [isSelected]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowQuickMenu(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

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
      // Store in module-level map for placement engine
      sceneRefs.set(propId, loadedScene);
      setScene(loadedScene);
      setStatus('ready');
    };

    const handleError = () => {
      clearTimeout(timeout);
      loadingRef.current = false;
      setStatus('error');
    };

    const fileData = getFileDataForProp(propId);
    if (fileData) {
      console.info(`[Props3D] Loading "${modelName}" from fileData (base64)`);
      loadFromBase64(fileData).then(handleSuccess).catch((err: unknown) => {
        console.warn(`[Props3D] fileData parse failed for "${modelName}":`, err);
        handleError();
      });
      return;
    }

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

    console.warn(`[Props3D] No fileData for "${modelName}", blob URL may fail`);
    handleError();
  };

  useEffect(() => {
    if (!url) { setStatus('idle'); return; }
    const baseUrl = url.split('?')[0];
    if (baseUrl === lastLoadedUrl.current) return;
    if (scene) { disposeScene(scene); setScene(null); }
    lastLoadedUrl.current = baseUrl;
    retryCount.current = 0;
    loadingRef.current = false;
    doLoad(id, url);

    return () => {
      lastLoadedUrl.current = '';
      sceneRefs.delete(id);
    };
  }, [url]);

  const canInteract = appMode === 'build' && (activeTool === 'select' || activeTool === 'furnish');

  const handleClick = (e: ThreeEvent<PointerEvent>) => {
    if (!canInteract) return;
    e.stopPropagation();
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    setSelection({ type: 'prop', id });
  };

  const handlePointerEnter = () => { if (canInteract) { setIsHovered(true); gl.domElement.style.cursor = 'pointer'; } };
  const handlePointerLeave = () => { setIsHovered(false); if (!isDragging) gl.domElement.style.cursor = ''; };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button !== 0) return;
    if (appMode !== 'build' || (activeTool !== 'select' && activeTool !== 'furnish')) return;
    e.stopPropagation();
    setSelection({ type: 'prop', id });
    setShowQuickMenu(false);
    longPressTriggered.current = false;

    // Record pointer position for long-press detection
    pointerDownPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };

    // Start long-press timer
    cancelLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setShowQuickMenu(true);
      setIsDragging(false);
      gl.domElement.style.cursor = '';
    }, LONG_PRESS_MS);

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
      // Check long-press movement threshold
      if (pointerDownPos.current && longPressTimer.current) {
        const dx = moveEvent.clientX - pointerDownPos.current.x;
        const dy = moveEvent.clientY - pointerDownPos.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_MOVE_THRESHOLD) {
          cancelLongPress();
        }
      }

      if (longPressTriggered.current) return;

      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((moveEvent.clientX - rect.left) / rect.width) * 2 - 1,
        -((moveEvent.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane.current, target);
      if (target) {
        const dragX = target.x - dragOffset.current.x;
        const dragZ = target.z - dragOffset.current.z;
        const store = useAppStore.getState();
        const currentProp = store.props.items.find((p) => p.id === id);
        const stableY = currentProp?.position[1] ?? position[1];

        store.updateProp(id, { position: [dragX, stableY, dragZ] });
        setDragShadowPos([dragX, stableY + 0.02, dragZ]);
      }
    };

    const onPointerUp = () => {
      cancelLongPress();
      setIsDragging(false);
      setDragShadowPos(null);
      gl.domElement.style.cursor = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // ─── Quick menu actions ───
  const handleQuickRotate = () => {
    const newRot: [number, number, number] = [rotation[0], rotation[1] + Math.PI / 4, rotation[2]];
    useAppStore.getState().updateProp(id, { rotation: newRot });
  };

  const handleQuickDuplicate = () => {
    const store = useAppStore.getState();
    const srcProp = store.props.items.find(p => p.id === id);
    if (!srcProp) return;
    const newId = `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    store.addProp({
      ...srcProp,
      id: newId,
      position: [srcProp.position[0] + 0.5, srcProp.position[1], srcProp.position[2]],
      modelStats: undefined,
      haEntityId: undefined,
      linkedDeviceId: undefined,
    });
    setShowQuickMenu(false);
    store.setSelection({ type: 'prop', id: newId });
  };

  const handleQuickDelete = () => {
    useAppStore.getState().removeProp(id);
    useAppStore.getState().setSelection({ type: null, id: null });
    setShowQuickMenu(false);
  };

  // ─── Display scene with selection feedback ───
  const displayScene = useMemo(() => {
    if (!scene) return null;
    const clone = scene.clone();
    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = true;
        child.material = child.material.clone();

        if (colorOverride) {
          child.material.color = new THREE.Color(colorOverride);
        }
        if (textureOverride) {
          const tex = new THREE.TextureLoader().load(textureOverride);
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(textureScale, textureScale);
          child.material.map = tex;
          child.material.needsUpdate = true;
        }
        if (roughnessOverride !== undefined) child.material.roughness = roughnessOverride;
        if (metalnessOverride !== undefined) child.material.metalness = metalnessOverride;

        if (isSelected) {
          child.material.emissive = new THREE.Color('#d4a574');
          child.material.emissiveIntensity = 0.15;
        } else if (isHovered) {
          child.material.emissive = new THREE.Color('#f5e6d3');
          child.material.emissiveIntensity = 0.08;
        }
      }
    });
    return clone;
  }, [scene, isSelected, isHovered, colorOverride, textureOverride, textureScale, roughnessOverride, metalnessOverride]);

  // ─── Bounding-box selection indicator (always correct, scale-aware) ───
  const selectionBox = useMemo(() => {
    if (!isSelected || !scene) return null;
    // Compute world-space bbox of the entire scene at identity transform
    const tempGroup = scene.clone();
    const bbox = new THREE.Box3().setFromObject(tempGroup);
    disposeScene(tempGroup);
    if (bbox.isEmpty()) return null;

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);

    // Add a small margin so the box doesn't sit flush on the mesh
    const margin = 0.03;
    const bw = size.x + margin;
    const bh = size.y + margin;
    const bd = size.z + margin;

    return { center: [center.x, center.y, center.z] as [number, number, number], size: [bw, bh, bd] as [number, number, number] };
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
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onContextMenu={(e: any) => { e.nativeEvent?.preventDefault?.(); e.stopPropagation(); }}
      />

      {/* Bounding-box selection wireframe — always correct regardless of geometry */}
      {selectionBox && (
        <lineSegments
          position={[
            position[0] + selectionBox.center[0] * scale[0],
            position[1] + selectionBox.center[1] * scale[1],
            position[2] + selectionBox.center[2] * scale[2],
          ]}
          rotation={rotation}
          raycast={() => {}}
        >
          <edgesGeometry args={[new THREE.BoxGeometry(
            selectionBox.size[0] * scale[0],
            selectionBox.size[1] * scale[1],
            selectionBox.size[2] * scale[2],
          )]} />
          <lineBasicMaterial color="#ffffff" transparent opacity={0.7} linewidth={1} />
        </lineSegments>
      )}

      {/* Drag shadow indicator */}
      {isDragging && dragShadowPos && (
        <mesh position={dragShadowPos} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.3, 24]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Long-press quick action menu */}
      {showQuickMenu && isSelected && (
        <Html
          center
          position={[position[0], position[1] + 1.2, position[2]]}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            style={{
              background: 'hsl(220 18% 13% / 0.95)',
              borderRadius: 12,
              padding: '6px 4px',
              display: 'flex',
              gap: 2,
              backdropFilter: 'blur(8px)',
              border: '1px solid hsl(220 10% 25% / 0.5)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleQuickRotate}
              style={{
                background: 'transparent', border: 'none', color: '#fff',
                padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                fontSize: 11, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 2, whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(220 10% 25% / 0.5)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 16 }}>↻</span>
              <span>Rotera</span>
            </button>
            <button
              onClick={handleQuickDuplicate}
              style={{
                background: 'transparent', border: 'none', color: '#fff',
                padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                fontSize: 11, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 2, whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(220 10% 25% / 0.5)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 16 }}>⊕</span>
              <span>Duplicera</span>
            </button>
            <button
              onClick={handleQuickDelete}
              style={{
                background: 'transparent', border: 'none', color: '#ef4444',
                padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                fontSize: 11, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 2, whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(0 60% 30% / 0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 16 }}>🗑</span>
              <span>Ta bort</span>
            </button>
          </div>
        </Html>
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
            colorOverride={prop.colorOverride}
            textureOverride={prop.textureOverride}
            textureScale={prop.textureScale}
            metalness={prop.metalness}
            roughness={prop.roughness}
          />
        </ErrorBoundary>
      ))}
    </group>
  );
}
