import { Suspense, useEffect, useState } from 'react';
import { useLoader } from '@react-three/fiber';
import { useAppStore } from '@/store/useAppStore';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ErrorBoundary } from './ErrorBoundary3D';

function ImportedModel({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  return <primitive object={gltf.scene.clone()} />;
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
    // If url is a blob that no longer exists, restore from fileData
    if (url && url.startsWith('blob:')) {
      fetch(url).then(() => {
        setValidUrl(url);
      }).catch(() => {
        // Blob is stale, restore from fileData
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
      // Non-blob url (unlikely but handle)
      setValidUrl(url);
    } else if (!url && fileData) {
      // No url but fileData exists - restore
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
  const validUrl = useRestoredUrl();

  if (homeGeometry.source !== 'imported' || !validUrl) return null;

  const { position, rotation, scale } = homeGeometry.imported;

  return (
    <group
      position={position}
      rotation={rotation.map((r) => (r * Math.PI) / 180) as [number, number, number]}
      scale={scale}
    >
      <ErrorBoundary fallback={<FallbackBox />}>
        <Suspense fallback={<FallbackBox />}>
          <ImportedModel url={validUrl} />
        </Suspense>
      </ErrorBoundary>
    </group>
  );
}
