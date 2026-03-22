import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useAppStore } from '../../store/useAppStore';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ErrorBoundary } from './ErrorBoundary3D';
import { analyzeModel } from '../../lib/modelAnalysis';
import * as THREE from 'three';

type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

const templateSceneCache = new Map<string, Promise<THREE.Group>>();
const modelStatsCache = new Map<string, ReturnType<typeof analyzeModel>>();

function disposeTemplateScene(scene: THREE.Object3D) {
  scene.traverse((child: any) => {
    if (!child.isMesh) return;
    child.geometry?.dispose();
    if (!child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat: any) => {
      if (mat.map) mat.map.dispose();
      if (mat.normalMap) mat.normalMap.dispose();
      if (mat.roughnessMap) mat.roughnessMap.dispose();
      if (mat.metalnessMap) mat.metalnessMap.dispose();
      if (mat.aoMap) mat.aoMap.dispose();
      if (mat.emissiveMap) mat.emissiveMap.dispose();
      if (mat.envMap) mat.envMap.dispose();
      mat.dispose();
    });
  });
}

function disposeInstanceScene(scene: THREE.Object3D) {
  scene.traverse((child: any) => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat: any) => {
      if (mat?.dispose) mat.dispose();
    });
  });
}

function loadTemplateScene(loadUrl: string) {
  const cached = templateSceneCache.get(loadUrl);
  if (cached) return cached;

  const promise = new Promise<THREE.Group>((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      loadUrl,
      (gltf) => {
        modelStatsCache.set(loadUrl, analyzeModel(gltf.scene));
        resolve(gltf.scene);
      },
      undefined,
      (err) => {
        templateSceneCache.delete(loadUrl);
        reject(err);
      }
    );
  });

  templateSceneCache.set(loadUrl, promise);
  return promise;
}

async function loadTemplateSceneWithTimeout(loadUrl: string, timeoutMs: number) {
  return Promise.race([
    loadTemplateScene(loadUrl),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function prepareInstanceMaterials(scene: THREE.Object3D) {
  scene.traverse((child: any) => {
    if (!child.isMesh || !child.material) return;
    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const clonedMaterials = sourceMaterials.map((mat: any) => {
      const cloned = mat.clone();
      cloned._originalTransparent = mat.transparent;
      cloned._originalOpacity = mat.opacity;
      return cloned;
    });
    child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0];
  });
}

function applySceneAppearance(scene: THREE.Object3D, opacity: number, shadowsEnabled: boolean) {
  const glassPattern = /glass|window|glas|fÃ¶nster/i;
  scene.traverse((child: any) => {
    if (!child.isMesh || !child.material) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    const meshIsGlass = materials.some((mat: any) =>
      mat.transparent || mat.opacity < 0.9 || glassPattern.test(mat.name || child.name)
    );

    child.castShadow = shadowsEnabled && !meshIsGlass;
    child.receiveShadow = shadowsEnabled;

    materials.forEach((mat: any) => {
      const origTransparent = mat._originalTransparent ?? false;
      const origOpacity = mat._originalOpacity ?? 1;

      if (opacity < 1) {
        mat.transparent = true;
        mat.opacity = opacity;
        mat.depthWrite = opacity > 0.5;
      } else {
        mat.transparent = origTransparent;
        mat.opacity = origOpacity;
        mat.depthWrite = !origTransparent || origOpacity > 0.5;
      }
      mat.needsUpdate = true;
    });
  });
}

function ImportedModel({ url, opacity, shadowsEnabled }: { url: string; opacity: number; shadowsEnabled: boolean }) {
  const [status, setStatus] = useState<ModelStatus>('idle');
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const retriedRef = useRef(false);
  const prevSceneRef = useRef<THREE.Group | null>(null);
  const requestIdRef = useRef(0);
  const setImportedModel = useAppStore((s) => s.setImportedModel);
  const hasStats = useAppStore((s) => !!s.homeGeometry.imported.modelStats);

  const loadModel = useCallback(async (loadUrl: string) => {
    const requestId = ++requestIdRef.current;
    setStatus('loading');

    try {
      const template = await loadTemplateSceneWithTimeout(loadUrl, 30000);
      if (requestId !== requestIdRef.current) return;

      if (prevSceneRef.current) {
        disposeInstanceScene(prevSceneRef.current);
      }

      const cloned = cloneSkeleton(template) as THREE.Group;
      prepareInstanceMaterials(cloned);
      applySceneAppearance(cloned, opacity, shadowsEnabled);
      prevSceneRef.current = cloned;

      if (!hasStats) {
        const stats = modelStatsCache.get(loadUrl);
        if (stats) setImportedModel({ modelStats: stats });
      }

      setScene(cloned);
      setStatus('ready');
    } catch (err) {
      console.error('[ImportedHome3D] Load error:', err);
      if (requestId !== requestIdRef.current) return;

      if (!retriedRef.current) {
        retriedRef.current = true;
        const bustUrl = loadUrl.includes('?') ? `${loadUrl}&v=${Date.now()}` : `${loadUrl}?v=${Date.now()}`;
        templateSceneCache.delete(loadUrl);
        loadModel(bustUrl);
      } else {
        setStatus('error');
      }
    }
  }, [opacity, shadowsEnabled, hasStats, setImportedModel]);

  useEffect(() => {
    retriedRef.current = false;
    loadModel(url);
    return () => {
      requestIdRef.current += 1;
      if (prevSceneRef.current) {
        disposeInstanceScene(prevSceneRef.current);
        prevSceneRef.current = null;
      }
    };
  }, [url, loadModel]);

  useEffect(() => {
    if (scene) {
      applySceneAppearance(scene, opacity, shadowsEnabled);
    }
  }, [opacity, shadowsEnabled, scene]);

  if (status === 'error') {
    return (
      <Html center>
        <div className="bg-destructive/90 text-destructive-foreground px-4 py-3 rounded-lg text-center space-y-2">
          <p className="text-sm font-medium">3D-modellen kunde inte laddas</p>
          <button
            onClick={() => { retriedRef.current = false; loadModel(url); }}
            className="px-3 py-1.5 rounded bg-background text-foreground text-xs hover:bg-muted transition"
          >
            Ladda om 3D-modell
          </button>
        </div>
      </Html>
    );
  }

  if (status === 'loading' || !scene) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#4a9eff" wireframe />
      </mesh>
    );
  }

  return <primitive object={scene} />;
}

function FallbackBox() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4a9eff" wireframe />
    </mesh>
  );
}

function useRestoredUrl() {
  const url = useAppStore((s) => s.homeGeometry.imported.url);
  const fileData = useAppStore((s) => s.homeGeometry.imported.fileData);
  const setImportedModel = useAppStore((s) => s.setImportedModel);
  const [validUrl, setValidUrl] = useState<string | null>(url);

  useEffect(() => {
    if (url && url.startsWith('/projects/')) {
      setValidUrl(url);
      return;
    }

    if (url && url.startsWith('blob:')) {
      fetch(url).then(() => {
        setValidUrl(url);
      }).catch(() => {
        if (fileData) {
          const binary = atob(fileData);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: 'model/gltf-binary' });
          const newUrl = URL.createObjectURL(blob);
          setImportedModel({ url: newUrl });
          setValidUrl(newUrl);
        } else {
          setValidUrl(null);
        }
      });
    } else if (url && fileData && !url.startsWith('blob:')) {
      setValidUrl(url);
    } else if (!url && fileData) {
      const binary = atob(fileData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'model/gltf-binary' });
      const newUrl = URL.createObjectURL(blob);
      setImportedModel({ url: newUrl });
      setValidUrl(newUrl);
    } else {
      setValidUrl(url);
    }
  }, [url, fileData, setImportedModel]);

  return validUrl;
}

export default function ImportedHome3D() {
  const homeGeometry = useAppStore((s) => s.homeGeometry);
  const shadowsEnabled = useAppStore((s) => s.performance.shadows);
  const validUrl = useRestoredUrl();

  useEffect(() => {
    return () => {
      for (const scenePromise of templateSceneCache.values()) {
        scenePromise.then((scene) => {
          // Keep cache alive for reuse during the session.
          void scene;
        }).catch(() => undefined);
      }
    };
  }, []);

  if (homeGeometry.source !== 'imported' || !validUrl) return null;

  const { position, rotation, scale, importedOpacity } = homeGeometry.imported;
  const opacity = importedOpacity ?? 1;

  return (
    <group
      position={position}
      rotation={rotation as [number, number, number]}
      scale={scale}
    >
      <ErrorBoundary fallback={<FallbackBox />}>
        <Suspense fallback={<FallbackBox />}>
          <ImportedModel url={validUrl} opacity={opacity} shadowsEnabled={shadowsEnabled} />
        </Suspense>
      </ErrorBoundary>
    </group>
  );
}
