import { Suspense, useEffect, useState } from 'react';
import { useLoader } from '@react-three/fiber';
import { useAppStore } from '../../store/useAppStore';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ErrorBoundary } from './ErrorBoundary3D';
import { analyzeModel } from '../../lib/modelAnalysis';
import * as THREE from 'three';

function ImportedModel({ url, opacity, shadowsEnabled }: { url: string; opacity: number; shadowsEnabled: boolean }) {
  const gltf = useLoader(GLTFLoader, url);
  const setImportedModel = useAppStore((s) => s.setImportedModel);
  const hasStats = useAppStore((s) => !!s.homeGeometry.imported.modelStats);

  useEffect(() => {
    if (gltf.scene) {
      let meshCount = 0;
      gltf.scene.traverse((c) => { if ((c as any).isMesh) meshCount++; });
      console.log(`[ImportedHome3D] Loaded model: ${meshCount} meshes, children: ${gltf.scene.children.length}`);
      
      if (!hasStats) {
        const stats = analyzeModel(gltf.scene);
        setImportedModel({ modelStats: stats });
      }
    }
  }, [gltf, hasStats, setImportedModel]);

  const scene = gltf.scene.clone();

  // Traverse meshes: enable shadows + apply opacity
  scene.traverse((child: any) => {
    if (child.isMesh) {
      // Shadows: only cast if opacity is high enough (otherwise sunlight passes through)
      const shouldCast = shadowsEnabled && opacity >= 0.8;
      child.castShadow = shouldCast;
      child.receiveShadow = shadowsEnabled;

      // Opacity/transparency
      if (opacity < 1) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = opacity;
        child.material.depthWrite = opacity > 0.5;
      }
    }
  });

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
      rotation={rotation.map((r) => (r * Math.PI) / 180) as [number, number, number]}
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
