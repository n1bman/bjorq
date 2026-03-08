import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useAppStore } from '../../store/useAppStore';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ErrorBoundary } from './ErrorBoundary3D';
import { analyzeModel } from '../../lib/modelAnalysis';
import * as THREE from 'three';

type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

function disposeScene(scene: THREE.Object3D) {
  scene.traverse((child: any) => {
    if (child.isMesh) {
      child.geometry?.dispose();
      if (child.material) {
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
      }
    }
  });
}

function ImportedModel({ url, opacity, shadowsEnabled }: { url: string; opacity: number; shadowsEnabled: boolean }) {
  const [status, setStatus] = useState<ModelStatus>('idle');
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const retriedRef = useRef(false);
  const prevSceneRef = useRef<THREE.Group | null>(null);
  const setImportedModel = useAppStore((s) => s.setImportedModel);
  const hasStats = useAppStore((s) => !!s.homeGeometry.imported.modelStats);

  const loadModel = useCallback((loadUrl: string) => {
    setStatus('loading');
    const loader = new GLTFLoader();
    const timeout = setTimeout(() => {
      if (!retriedRef.current) {
        retriedRef.current = true;
        const bustUrl = loadUrl.includes('?') ? `${loadUrl}&v=${Date.now()}` : `${loadUrl}?v=${Date.now()}`;
        loadModel(bustUrl);
      } else {
        setStatus('error');
      }
    }, 30000);

    loader.load(
      loadUrl,
      (gltf) => {
        clearTimeout(timeout);
        if (prevSceneRef.current) {
          disposeScene(prevSceneRef.current);
        }
        const cloned = gltf.scene.clone();
        prevSceneRef.current = cloned;

        // Analyze model stats
        if (!hasStats) {
          const stats = analyzeModel(gltf.scene);
          setImportedModel({ modelStats: stats });
        }

        // Setup meshes: house model does NOT cast shadows, only receives
        cloned.traverse((child: any) => {
          if (child.isMesh) {
            const isGlass = child.material.transparent
              || child.material.opacity < 0.9
              || /glass|window|glas|fönster/i.test(child.material.name || child.name);
            child.castShadow = shadowsEnabled && !isGlass;
            child.receiveShadow = shadowsEnabled;

            // Preserve original transparency state (for glass/windows)
            child.material = child.material.clone();
            child.material._originalTransparent = child.material.transparent;
            child.material._originalOpacity = child.material.opacity;

            if (opacity < 1) {
              child.material.transparent = true;
              child.material.opacity = opacity;
              child.material.depthWrite = opacity > 0.5;
            }
          }
        });

        setScene(cloned);
        setStatus('ready');
      },
      undefined,
      (err) => {
        clearTimeout(timeout);
        console.error('[ImportedHome3D] Load error:', err);
        if (!retriedRef.current) {
          retriedRef.current = true;
          const bustUrl = loadUrl.includes('?') ? `${loadUrl}&v=${Date.now()}` : `${loadUrl}?v=${Date.now()}`;
          loadModel(bustUrl);
        } else {
          setStatus('error');
        }
      }
    );
  }, [opacity, shadowsEnabled, hasStats, setImportedModel]);

  useEffect(() => {
    retriedRef.current = false;
    loadModel(url);
    return () => {
      if (prevSceneRef.current) {
        disposeScene(prevSceneRef.current);
        prevSceneRef.current = null;
      }
    };
  }, [url]); // Only reload on URL change

  // Re-apply shadow/opacity settings when they change without reloading
  useEffect(() => {
    if (scene) {
      scene.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = shadowsEnabled;
          if (opacity < 1) {
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.opacity = opacity;
            child.material.depthWrite = opacity > 0.5;
          } else {
            // Restore original transparency (preserve glass/windows)
            const origTransparent = child.material._originalTransparent ?? false;
            const origOpacity = child.material._originalOpacity ?? 1;
            if (child.material.transparent !== origTransparent || child.material.opacity !== origOpacity) {
              child.material = child.material.clone();
              child.material.transparent = origTransparent;
              child.material.opacity = origOpacity;
              child.material.depthWrite = !origTransparent || origOpacity > 0.5;
            }
          }
        }
      });
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

// Restore blob URL from base64 fileData if the stored URL is stale
function useRestoredUrl() {
  const url = useAppStore((s) => s.homeGeometry.imported.url);
  const fileData = useAppStore((s) => s.homeGeometry.imported.fileData);
  const setImportedModel = useAppStore((s) => s.setImportedModel);
  const [validUrl, setValidUrl] = useState<string | null>(url);

  useEffect(() => {
    // Server-relative URLs (hosted mode) are always valid
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
        <ImportedModel url={validUrl} opacity={opacity} shadowsEnabled={shadowsEnabled} />
      </ErrorBoundary>
    </group>
  );
}
